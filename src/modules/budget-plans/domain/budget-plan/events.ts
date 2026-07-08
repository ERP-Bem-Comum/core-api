import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { ProgramRef } from '../shared/refs.ts';

export type BudgetPlanEvent = Readonly<{
  type: 'BudgetPlanCreated';
  budgetPlanId: BudgetPlanId;
  year: number;
  programRef: ProgramRef;
  occurredAt: Date;
}>;
