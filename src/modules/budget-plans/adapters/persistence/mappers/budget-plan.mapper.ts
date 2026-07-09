import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import {
  ProgramRef,
  PartnerStateRef,
  PartnerMunicipalityRef,
} from '#src/modules/budget-plans/domain/shared/refs.ts';
import { isBudgetPlanStatus } from '#src/modules/budget-plans/domain/budget-plan/status.ts';
import type {
  BudgetPlan,
  Budget,
  BudgetPartner,
} from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type * as schema from '../schemas/mysql.ts';

export type BudgetPlanMapperError =
  | 'budget-plan-mapper-invalid-id'
  | 'budget-plan-mapper-invalid-program-ref'
  | 'budget-plan-mapper-invalid-status'
  | 'budget-plan-mapper-invalid-budget-id'
  | 'budget-plan-mapper-invalid-partner-kind'
  | 'budget-plan-mapper-invalid-partner-ref'
  | 'budget-plan-mapper-invalid-money';

type BudgetPlanRow = typeof schema.budgetPlans.$inferSelect;
type NewBudgetPlanRow = typeof schema.budgetPlans.$inferInsert;
type BudgetRow = typeof schema.budgets.$inferSelect;
type NewBudgetRow = typeof schema.budgets.$inferInsert;

export const budgetPlanToInsert = (plan: BudgetPlan): NewBudgetPlanRow => ({
  id: plan.id as unknown as string,
  year: plan.year,
  programRef: plan.programRef as unknown as string,
  versionMajor: plan.version.major,
  versionMinor: plan.version.minor,
  status: plan.status,
  parentId: plan.parentId === null ? null : String(plan.parentId),
  scenarioName: plan.scenarioName,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

export const budgetToInsert = (
  budget: Budget,
  budgetPlanId: BudgetPlanId.BudgetPlanId,
): NewBudgetRow => ({
  id: budget.id as unknown as string,
  budgetPlanId: budgetPlanId as unknown as string,
  partnerKind: budget.partner.kind,
  partnerRef: budget.partner.ref as unknown as string,
  valueCents: budget.value.cents,
});

const parsePartner = (row: Readonly<BudgetRow>): Result<BudgetPartner, BudgetPlanMapperError> => {
  if (row.partnerKind === 'state') {
    const ref = PartnerStateRef.rehydrate(row.partnerRef);
    if (!ref.ok) return err('budget-plan-mapper-invalid-partner-ref');
    return ok({ kind: 'state', ref: ref.value });
  }
  if (row.partnerKind === 'municipality') {
    const ref = PartnerMunicipalityRef.rehydrate(row.partnerRef);
    if (!ref.ok) return err('budget-plan-mapper-invalid-partner-ref');
    return ok({ kind: 'municipality', ref: ref.value });
  }
  return err('budget-plan-mapper-invalid-partner-kind');
};

const budgetFromRow = (row: Readonly<BudgetRow>): Result<Budget, BudgetPlanMapperError> => {
  const id = BudgetId.rehydrate(row.id);
  if (!id.ok) return err('budget-plan-mapper-invalid-budget-id');

  const partner = parsePartner(row);
  if (!partner.ok) return partner;

  const value = Money.fromCents(row.valueCents);
  if (!value.ok) return err('budget-plan-mapper-invalid-money');

  return ok({ id: id.value, partner: partner.value, value: value.value });
};

export const budgetPlanFromRow = (
  row: Readonly<BudgetPlanRow>,
  budgetRows: readonly Readonly<BudgetRow>[],
): Result<BudgetPlan, BudgetPlanMapperError> => {
  const id = BudgetPlanId.rehydrate(row.id);
  if (!id.ok) return err('budget-plan-mapper-invalid-id');

  const programRef = ProgramRef.rehydrate(row.programRef);
  if (!programRef.ok) return err('budget-plan-mapper-invalid-program-ref');

  if (!isBudgetPlanStatus(row.status)) return err('budget-plan-mapper-invalid-status');

  let parentId: BudgetPlanId.BudgetPlanId | null = null;
  if (row.parentId !== null) {
    const rehydrated = BudgetPlanId.rehydrate(row.parentId);
    if (!rehydrated.ok) return err('budget-plan-mapper-invalid-id');
    parentId = rehydrated.value;
  }

  const budgets: Budget[] = [];
  for (const budgetRow of budgetRows) {
    const mapped = budgetFromRow(budgetRow);
    if (!mapped.ok) return mapped;
    budgets.push(mapped.value);
  }

  return ok({
    id: id.value,
    year: row.year,
    programRef: programRef.value,
    version: { major: row.versionMajor, minor: row.versionMinor },
    status: row.status,
    budgets,
    parentId,
    scenarioName: row.scenarioName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
};
