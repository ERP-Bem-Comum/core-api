import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import * as BudgetId from '../../domain/shared/budget-id.ts';
import * as CostCenterId from '../../domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '../../domain/cost-structure/category-id.ts';
import * as SubcategoryId from '../../domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '../../domain/budget-result/budget-result-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import type { BudgetPlansModuleEvent } from '../../public-api/events.ts';
import { planTotalCents } from '../read-models/plan-total.ts';
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
import type { PlanCloneWriter, PlanCloneWriteError } from '../ports/plan-clone-writer.ts';

export type ClonePlanContentError =
  | BudgetPlanError
  | CostStructureRepositoryError
  | BudgetResultRepositoryError
  | PlanCloneWriteError
  // #1092 — lançamento da origem cuja subcategoria não está na árvore do mesmo plano. Não há FK
  // entre as duas tabelas, e só uma chamada direta à API com ids de planos diferentes produz esse
  // estado (medido: 0 de 4.679 no legado; a tela tira os dois ids do mesmo plano). Antes, o
  // lançamento era pulado em silêncio e o total da cópia saía menor que o da origem.
  | 'budget-result-orphan-subcategory';

// #458 — o filho clonado tem total (os lançamentos vieram junto). Devolvido para a response 201 não
// mentir. Compartilhado com createBudgetPlan (importação), startCalibration e createScenery.
export type ClonePlanContentOutcome = Readonly<{ plan: BudgetPlanEntity; totalInCents: number }>;

export type ClonePlanContentDeps = Readonly<{
  costStructureRepo: CostStructureRepository;
  budgetResultRepo: BudgetResultRepository;
  planCloneWriter: PlanCloneWriter;
}>;

// Copia o conteúdo inteiro origem→destino: budgets (novos ids), árvore de custos (CostStructure.clone,
// ativo/inativo incluído) e lançamentos remapeados pelos dois mapas (copia valor, não recalcula).
//
// #1092 — monta TUDO em memória e grava numa operação só (`planCloneWriter`, uma transação no MySQL).
// Gravar repositório a repositório deixava plano parcial quando um passo falhava.
//
// `target` é o plano novo já decidido pelo domínio, nascido sem budgets. `events` vão no mesmo commit
// (a importação leva o BudgetPlanCreated; calibração e cenário não emitem). `actor` é quem originou a
// cópia (BGP-UPDATED-BY-AUDIT/#373).
export type ClonePlanContentInput = Readonly<{
  source: BudgetPlanEntity;
  target: BudgetPlanEntity;
  now: Date;
  actor: UserRef;
  events?: readonly BudgetPlansModuleEvent[];
}>;

export const clonePlanContent =
  (deps: ClonePlanContentDeps) =>
  async ({
    source,
    target,
    now,
    actor,
    events = [],
  }: ClonePlanContentInput): Promise<Result<ClonePlanContentOutcome, ClonePlanContentError>> => {
    // budgets (novos ids) → budgetIdMap
    const budgetIdMap = new Map<string, BudgetId.BudgetId>();
    let plan = target;
    for (const budget of source.budgets) {
      const newBudgetId = BudgetId.generate();
      budgetIdMap.set(String(budget.id), newBudgetId);
      const added = BudgetPlan.addBudget(
        plan,
        { id: newBudgetId, partner: budget.partner },
        now,
        actor,
      );
      if (!added.ok) return added;
      plan = added.value.plan;
    }

    // Lançamentos ANTES da árvore (F2 da revisão). Nó de custo nunca é apagado (#454: só desativa), então
    // a árvore só cresce: todo lançamento lido aqui tem a subcategoria na árvore lida depois. Na ordem
    // inversa, uma subcategoria criada entre as duas leituras, com lançamento, virava órfão falso.
    // Uma consulta só para todas as redes (F9: era uma por rede).
    const sourceResults = await deps.budgetResultRepo.listByBudgetIds(
      source.budgets.map((b) => b.id),
    );
    if (!sourceResults.ok) return sourceResults;

    // árvore de custos (novos ids) → subcategoryIdMap
    const sourceStructure = await deps.costStructureRepo.findByBudgetPlanId(source.id);
    if (!sourceStructure.ok) return sourceStructure;
    const cloned = CostStructure.clone(sourceStructure.value, target.id, {
      costCenter: () => CostCenterId.generate(),
      category: () => CategoryId.generate(),
      subcategory: () => SubcategoryId.generate(),
    });

    // lançamentos remapeados (budgetId + subcategoryId)
    const results: BudgetResult.BudgetResult[] = [];
    const sums = new Map<string, number>();
    for (const result of sourceResults.value) {
      const newBudgetId = budgetIdMap.get(String(result.budgetId));
      if (newBudgetId === undefined) continue; // inalcançável: a consulta foi pelos ids deste mapa
      const newSubcategoryId = cloned.subcategoryIdMap.get(String(result.subcategoryId));
      if (newSubcategoryId === undefined) return err('budget-result-orphan-subcategory');
      results.push(
        BudgetResult.clone(result, {
          id: BudgetResultId.generate(),
          budgetId: newBudgetId,
          subcategoryId: newSubcategoryId,
        }),
      );
      const key = String(newBudgetId);
      sums.set(key, (sums.get(key) ?? 0) + result.value.cents);
    }

    const written = await deps.planCloneWriter.write({
      plan,
      events,
      structure: cloned.structure,
      results,
    });
    if (!written.ok) return written;

    // #458 — o total da response é a soma dos lançamentos copiados, não 0: lista e detalhe mostram
    // a mesma soma, derivada de bgp_budget_results.
    return ok({ plan, totalInCents: planTotalCents(plan, sums) });
  };
