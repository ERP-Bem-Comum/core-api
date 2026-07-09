import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import * as BudgetId from '../../domain/shared/budget-id.ts';
import { PartnerStateRef, PartnerMunicipalityRef } from '../../domain/shared/refs.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { Budget, BudgetPartner } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';

export type AddBudgetCommand = Readonly<{
  budgetPlanId: string;
  partnerKind: 'state' | 'municipality';
  partnerRef: string;
  valueInCents: number;
}>;

export type AddBudgetError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-ref-invalid'
  | 'budget-plan-invalid-money'
  | 'budget-plan-not-found'
  | BudgetPlanError
  | BudgetPlanRepositoryError;

export type AddBudgetDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  clock: Clock;
}>;

// Resolve a Rede (estado XOR município) validando o formato do ref por tipo.
const resolvePartner = (
  kind: 'state' | 'municipality',
  ref: string,
): Result<BudgetPartner, 'budget-plan-ref-invalid'> => {
  if (kind === 'state') {
    const r = PartnerStateRef.rehydrate(ref);
    return r.ok ? ok({ kind: 'state', ref: r.value }) : r;
  }
  const r = PartnerMunicipalityRef.rehydrate(ref);
  return r.ok ? ok({ kind: 'municipality', ref: r.value }) : r;
};

// POST budget (parte 1/US3): adiciona um orçamento por Rede (estado XOR município) ao plano. A
// unicidade por parceiro é do domínio (BudgetPlan.addBudget -> budget-plan-duplicate-partner).
export const addBudget =
  (deps: AddBudgetDeps) =>
  async (cmd: AddBudgetCommand): Promise<Result<Budget, AddBudgetError>> => {
    const planId = BudgetPlanId.rehydrate(cmd.budgetPlanId);
    if (!planId.ok) return planId;

    const value = Money.fromCents(cmd.valueInCents);
    if (!value.ok) return err('budget-plan-invalid-money');

    const partner = resolvePartner(cmd.partnerKind, cmd.partnerRef);
    if (!partner.ok) return partner;

    const found = await deps.planRepo.findById(planId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');

    const budgetId = BudgetId.generate();
    const added = BudgetPlan.addBudget(
      found.value,
      { id: budgetId, partner: partner.value, value: value.value },
      deps.clock.now(),
    );
    if (!added.ok) return added;

    const saved = await deps.planRepo.save(added.value.plan, []);
    if (!saved.ok) return saved;

    return ok({ id: budgetId, partner: partner.value, value: value.value });
  };
