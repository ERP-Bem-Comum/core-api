import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import * as BudgetId from '../../domain/shared/budget-id.ts';
import * as CostCenterId from '../../domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '../../domain/cost-structure/category-id.ts';
import * as SubcategoryId from '../../domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '../../domain/budget-result/budget-result-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import * as CostStructure from '../../domain/cost-structure/cost-structure.ts';
import type {
  CostStructureRepository,
  CostStructureRepositoryError,
} from '../../domain/cost-structure/repository.ts';
import * as BudgetResult from '../../domain/budget-result/budget-result.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';

export type StartCalibrationCommand = Readonly<{ parentPlanId: string }>;

export type StartCalibrationError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | BudgetPlanError
  | CostStructureRepositoryError
  | BudgetResultRepositoryError
  | BudgetPlanRepositoryError;

export type StartCalibrationDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  costStructureRepo: CostStructureRepository;
  budgetResultRepo: BudgetResultRepository;
  clock: Clock;
}>;

// US4 — deriva uma calibração (filho EM_CALIBRACAO) de um plano APROVADO e clona o conteúdo inteiro
// pai→filho com novos ids: budgets, árvore de custos e budget_results (remapeados via os mapas). O
// aprovado é preservado. Não transacional cross-repo (molde do legado, assíncrono por eventos) —
// falha parcial deixa o filho incompleto; aceitável (o filho é descartável até a aprovação).
export const startCalibration =
  (deps: StartCalibrationDeps) =>
  async (
    cmd: StartCalibrationCommand,
  ): Promise<Result<Readonly<{ plan: BudgetPlanEntity }>, StartCalibrationError>> => {
    const parentId = BudgetPlanId.rehydrate(cmd.parentPlanId);
    if (!parentId.ok) return parentId;

    const found = await deps.planRepo.findById(parentId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');
    const parent = found.value;

    const now = deps.clock.now();
    const childId = BudgetPlanId.generate();

    // 1. header do filho (domínio valida APROVADO + não-cenário; nasce sem budgets)
    const derived = BudgetPlan.startCalibration(parent, childId, now);
    if (!derived.ok) return derived;

    // 2. clona budgets (novos ids) montando o mapa oldBudgetId->newBudgetId
    const budgetIdMap = new Map<string, BudgetId.BudgetId>();
    let child = derived.value.plan;
    for (const budget of parent.budgets) {
      const newBudgetId = BudgetId.generate();
      budgetIdMap.set(String(budget.id), newBudgetId);
      const added = BudgetPlan.addBudget(
        child,
        { id: newBudgetId, partner: budget.partner, value: budget.value },
        now,
      );
      if (!added.ok) return added;
      child = added.value.plan;
    }
    const savedPlan = await deps.planRepo.save(child, []);
    if (!savedPlan.ok) return savedPlan;

    // 3. clona a árvore de custos (novos ids), guardando o mapa oldSubcatId->newSubcatId
    const parentStructure = await deps.costStructureRepo.findByBudgetPlanId(parentId.value);
    if (!parentStructure.ok) return parentStructure;
    const clonedStructure = CostStructure.clone(parentStructure.value, childId, {
      costCenter: () => CostCenterId.generate(),
      category: () => CategoryId.generate(),
      subcategory: () => SubcategoryId.generate(),
    });
    const savedStructure = await deps.costStructureRepo.save(clonedStructure.structure);
    if (!savedStructure.ok) return savedStructure;

    // 4. clona os budget_results remapeando budgetId + subcategoryId. Result cuja subcategoria não
    // foi clonada é ignorado (não deveria ocorrer — a árvore é a mesma) — paridade com o legado.
    for (const budget of parent.budgets) {
      const newBudgetId = budgetIdMap.get(String(budget.id));
      if (newBudgetId === undefined) continue;
      const results = await deps.budgetResultRepo.listByBudgetId(budget.id);
      if (!results.ok) return results;
      for (const result of results.value) {
        const newSubcatId = clonedStructure.subcategoryIdMap.get(String(result.subcategoryId));
        if (newSubcatId === undefined) continue;
        const addedResult = await deps.budgetResultRepo.add(
          BudgetResult.clone(result, {
            id: BudgetResultId.generate(),
            budgetId: newBudgetId,
            subcategoryId: newSubcatId,
          }),
        );
        if (!addedResult.ok) return addedResult;
      }
    }

    return ok({ plan: child });
  };
