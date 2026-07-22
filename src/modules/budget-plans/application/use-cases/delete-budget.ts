import { type Result, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import * as BudgetId from '../../domain/shared/budget-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';

export type DeleteBudgetCommand = Readonly<{
  budgetPlanId: string;
  budgetId: string;
  updatedByRef: string;
}>;

export type DeleteBudgetError =
  | BudgetPlanId.BudgetPlanIdError
  | BudgetId.BudgetIdError
  | 'budget-plan-not-found'
  | BudgetPlanError
  | BudgetPlanRepositoryError
  | UserRef.UserRefError;

export type DeleteBudgetDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  clock: Clock;
}>;

// CA4: remove o orçamento do plano e seus resultados dependentes ATOMICAMENTE — o `removeBudget`
// persiste o plano-sem-o-budget e apaga os bgp_budget_results na mesma transação (rollback total se
// algo falha). Fecha o gap dos 2 awaits antigos que deixava resultados órfãos (D2, resolvido).
export const deleteBudget =
  (deps: DeleteBudgetDeps) =>
  async (cmd: DeleteBudgetCommand): Promise<Result<void, DeleteBudgetError>> => {
    const planId = BudgetPlanId.rehydrate(cmd.budgetPlanId);
    if (!planId.ok) return planId;

    const budgetId = BudgetId.rehydrate(cmd.budgetId);
    if (!budgetId.ok) return budgetId;

    const actor = UserRef.rehydrate(cmd.updatedByRef);
    if (!actor.ok) return actor;

    const found = await deps.planRepo.findById(planId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');

    const removed = BudgetPlan.removeBudget(
      found.value,
      budgetId.value,
      deps.clock.now(),
      actor.value,
    );
    if (!removed.ok) return removed;

    return deps.planRepo.removeBudget(removed.value.plan, budgetId.value, []);
  };
