import { type Result, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import * as BudgetId from '../../domain/shared/budget-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';

export type DeleteBudgetCommand = Readonly<{ budgetPlanId: string; budgetId: string }>;

export type DeleteBudgetError =
  | BudgetPlanId.BudgetPlanIdError
  | BudgetId.BudgetIdError
  | 'budget-plan-not-found'
  | BudgetPlanError
  | BudgetPlanRepositoryError
  | BudgetResultRepositoryError;

export type DeleteBudgetDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  budgetResultRepo: BudgetResultRepository;
  clock: Clock;
}>;

// CA4: remove o orçamento do plano e, na sequência, seus resultados dependentes (delete explícito,
// D2 — sem FK cascade). Se o delete dos resultados falhar após o save, eles ficam órfãos até um
// retry — aceitável (dois repos, sem tx cross-agregado); documentado em DESIGN-DECISIONS.md.
export const deleteBudget =
  (deps: DeleteBudgetDeps) =>
  async (cmd: DeleteBudgetCommand): Promise<Result<void, DeleteBudgetError>> => {
    const planId = BudgetPlanId.rehydrate(cmd.budgetPlanId);
    if (!planId.ok) return planId;

    const budgetId = BudgetId.rehydrate(cmd.budgetId);
    if (!budgetId.ok) return budgetId;

    const found = await deps.planRepo.findById(planId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');

    const removed = BudgetPlan.removeBudget(found.value, budgetId.value, deps.clock.now());
    if (!removed.ok) return removed;

    const saved = await deps.planRepo.save(removed.value.plan, []);
    if (!saved.ok) return saved;

    return deps.budgetResultRepo.deleteByBudgetId(budgetId.value);
  };
