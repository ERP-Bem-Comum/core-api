import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
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

export type ClonePlanContentError =
  | BudgetPlanError
  | CostStructureRepositoryError
  | BudgetResultRepositoryError
  | BudgetPlanRepositoryError;

export type ClonePlanContentDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  costStructureRepo: CostStructureRepository;
  budgetResultRepo: BudgetResultRepository;
}>;

// US4 — clona o conteúdo inteiro pai→filho (compartilhado por startCalibration e createScenery): budgets
// (novos ids), árvore de custos (CostStructure.clone) e budget_results (remapeados via os mapas; copia
// valor, não recalcula). Persiste tudo. Não transacional cross-repo (molde do legado — filho descartável
// até a aprovação). `childHeader` é o filho JÁ derivado pelo domínio, nascido sem budgets. `actor` é o
// derivador (BGP-UPDATED-BY-AUDIT/#373) — mesmo ator que originou a derivação (D5).
export const clonePlanContent =
  (deps: ClonePlanContentDeps) =>
  async (
    parent: BudgetPlanEntity,
    childHeader: BudgetPlanEntity,
    now: Date,
    actor: UserRef,
  ): Promise<Result<Readonly<{ plan: BudgetPlanEntity }>, ClonePlanContentError>> => {
    // budgets (novos ids) → budgetIdMap
    const budgetIdMap = new Map<string, BudgetId.BudgetId>();
    let child = childHeader;
    for (const budget of parent.budgets) {
      const newBudgetId = BudgetId.generate();
      budgetIdMap.set(String(budget.id), newBudgetId);
      const added = BudgetPlan.addBudget(
        child,
        { id: newBudgetId, partner: budget.partner, value: budget.value },
        now,
        actor,
      );
      if (!added.ok) return added;
      child = added.value.plan;
    }
    const savedPlan = await deps.planRepo.save(child, []);
    if (!savedPlan.ok) return savedPlan;

    // árvore de custos (novos ids) → subcatMap
    const parentStructure = await deps.costStructureRepo.findByBudgetPlanId(parent.id);
    if (!parentStructure.ok) return parentStructure;
    const clonedStructure = CostStructure.clone(parentStructure.value, childHeader.id, {
      costCenter: () => CostCenterId.generate(),
      category: () => CategoryId.generate(),
      subcategory: () => SubcategoryId.generate(),
    });
    const savedStructure = await deps.costStructureRepo.save(clonedStructure.structure);
    if (!savedStructure.ok) return savedStructure;

    // budget_results (remapeia budgetId + subcategoryId). Result de subcategoria não clonada é ignorado.
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
