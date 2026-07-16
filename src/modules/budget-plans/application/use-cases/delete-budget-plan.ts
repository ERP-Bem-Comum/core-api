import { type Result, err } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';

export type DeleteBudgetPlanCommand = Readonly<{
  budgetPlanId: string;
}>;

export type DeleteBudgetPlanError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | BudgetPlanError
  | BudgetPlanRepositoryError;

export type DeleteBudgetPlanDeps = Readonly<{
  planRepo: BudgetPlanRepository;
}>;

// #453 — exclui o plano inteiro (≠ deleteBudget, que tira um orçamento de dentro dele).
//
// `listChildren` é obrigatório antes da guarda: a decisão "tem filho?" não se lê do agregado, que só
// conhece os próprios orçamentos — a árvore vive no repositório.
//
// Sem ator/updatedByRef: nada é auditado num registro que deixa de existir.
export const deleteBudgetPlan =
  (deps: DeleteBudgetPlanDeps) =>
  async (cmd: DeleteBudgetPlanCommand): Promise<Result<void, DeleteBudgetPlanError>> => {
    const planId = BudgetPlanId.rehydrate(cmd.budgetPlanId);
    if (!planId.ok) return planId;

    const found = await deps.planRepo.findById(planId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');

    const children = await deps.planRepo.listChildren(planId.value);
    if (!children.ok) return children;

    const allowed = BudgetPlan.remove(found.value, children.value);
    if (!allowed.ok) return allowed;

    // A guarda acima roda fora da transação: numa corrida, quem barra é a FK RESTRICT do parent_id,
    // e o repo devolve o mesmo `budget-plan-has-children` — o cliente vê 409 nos dois caminhos.
    return deps.planRepo.remove(planId.value);
  };
