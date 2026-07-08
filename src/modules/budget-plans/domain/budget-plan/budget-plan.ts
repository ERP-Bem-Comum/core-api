import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { BudgetId } from '../shared/budget-id.ts';
import type { ProgramRef } from '../shared/refs.ts';
import type { BudgetPlan as BudgetPlanEntity, Budget, BudgetPartner } from './types.ts';
import type { BudgetPlanError } from './errors.ts';
import type { BudgetPlanEvent } from './events.ts';
import * as PlanVersion from './version.ts';

// Faixa plausível de ano de planejamento (legado não valida; fail-closed aqui).
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

export type CreateBudgetPlanInput = Readonly<{
  id: BudgetPlanId;
  year: number;
  programRef: ProgramRef;
  now: Date;
}>;

export type AddBudgetInput = Readonly<{
  id: BudgetId;
  partner: BudgetPartner;
  value: Money.Money;
}>;

const samePartner = (a: BudgetPartner, b: BudgetPartner): boolean =>
  a.kind === b.kind && String(a.ref) === String(b.ref);

const create = (
  input: CreateBudgetPlanInput,
): Result<Readonly<{ plan: BudgetPlanEntity; event: BudgetPlanEvent }>, BudgetPlanError> => {
  if (!Number.isInteger(input.year) || input.year < YEAR_MIN || input.year > YEAR_MAX) {
    return err('budget-plan-invalid-year');
  }

  const plan: BudgetPlanEntity = {
    id: input.id,
    year: input.year,
    programRef: input.programRef,
    version: PlanVersion.initial(),
    status: 'RASCUNHO',
    budgets: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
  return ok({
    plan,
    event: {
      type: 'BudgetPlanCreated',
      budgetPlanId: plan.id,
      year: plan.year,
      programRef: plan.programRef,
      occurredAt: input.now,
    },
  });
};

// Invariante do legado (índices únicos budgets×parceiro): no máx. 1 orçamento por
// estado parceiro e 1 por município parceiro dentro do plano.
const addBudget = (
  plan: BudgetPlanEntity,
  input: AddBudgetInput,
  now: Date,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (plan.budgets.some((b) => samePartner(b.partner, input.partner))) {
    return err('budget-plan-duplicate-partner');
  }
  const budget: Budget = { id: input.id, partner: input.partner, value: input.value };
  return ok({
    plan: { ...plan, budgets: [...plan.budgets, budget], updatedAt: now },
  });
};

const total = (plan: BudgetPlanEntity): Money.Money =>
  plan.budgets.reduce((acc, b) => Money.add(acc, b.value), Money.ZERO);

export const BudgetPlan = { create, addBudget, total } as const;
