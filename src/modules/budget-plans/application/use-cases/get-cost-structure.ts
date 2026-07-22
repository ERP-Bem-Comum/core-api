import { type Result, err } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import type { CostStructure } from '../../domain/cost-structure/types.ts';
import type {
  CostStructureRepository,
  CostStructureRepositoryError,
} from '../../domain/cost-structure/repository.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';

export type GetCostStructureError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | BudgetPlanRepositoryError
  | CostStructureRepositoryError;

export type GetCostStructureDeps = Readonly<{
  costStructureRepo: CostStructureRepository;
  planRepo: BudgetPlanRepository;
}>;

// Estratégia α (early return): valida id -> confere existência do plano -> reconstrói a árvore.
// Plano sem nós devolve árvore VAZIA (o repo já resolve isso — não é erro).
export const getCostStructure =
  (deps: GetCostStructureDeps) =>
  async (rawId: string): Promise<Result<CostStructure, GetCostStructureError>> => {
    const id = BudgetPlanId.rehydrate(rawId);
    if (!id.ok) return id;

    const plan = await deps.planRepo.findById(id.value);
    if (!plan.ok) return plan;
    if (plan.value === null) return err('budget-plan-not-found');

    return deps.costStructureRepo.findByBudgetPlanId(id.value);
  };
