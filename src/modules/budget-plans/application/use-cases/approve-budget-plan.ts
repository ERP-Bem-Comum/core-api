import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import type {
  BudgetResultRepository,
  BudgetResultSumError,
} from '../../domain/budget-result/repository.ts';
import { planTotal, type PlanTotalError } from '../read-models/plan-total.ts';

export type ApproveBudgetPlanCommand = Readonly<{ planId: string; updatedByRef: string }>;

export type ApproveBudgetPlanOutcome = Readonly<{ plan: BudgetPlanEntity; totalInCents: number }>;

export type ApproveBudgetPlanError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | BudgetPlanError
  | BudgetPlanRepositoryError
  | BudgetResultSumError
  | PlanTotalError
  | UserRef.UserRefError;

export type ApproveBudgetPlanDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  budgetResultRepo: BudgetResultRepository;
  clock: Clock;
}>;

// US4/CA2 — aprova o plano (transição → APROVADO; bloqueia edição via guard de status a jusante).
// PROMOÇÃO (decisão 2026-07-09): semântica limpa — aprovar o filho o torna a versão vigente; o pai
// permanece como histórico. NÃO replicamos o `copy` do legado (que apaga+reclona o pai e deixa pai
// e filho ambos APROVADO com conteúdo duplicado — dívida do legado, descartada de propósito).
export const approveBudgetPlan =
  (deps: ApproveBudgetPlanDeps) =>
  async (
    cmd: ApproveBudgetPlanCommand,
  ): Promise<Result<ApproveBudgetPlanOutcome, ApproveBudgetPlanError>> => {
    const planId = BudgetPlanId.rehydrate(cmd.planId);
    if (!planId.ok) return planId;

    const actor = UserRef.rehydrate(cmd.updatedByRef);
    if (!actor.ok) return actor;

    const found = await deps.planRepo.findById(planId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');

    const approved = BudgetPlan.approve(found.value, deps.clock.now(), actor.value);
    if (!approved.ok) return approved;

    const sums = await deps.budgetResultRepo.sumByBudgetIds(
      approved.value.plan.budgets.map((b) => b.id),
    );
    if (!sums.ok) return sums;
    const total = planTotal(approved.value.plan, sums.value);
    if (!total.ok) return total;

    const saved = await deps.planRepo.save(approved.value.plan, []);
    if (!saved.ok) return saved;

    return ok({ plan: approved.value.plan, totalInCents: total.value.cents });
  };
