/** Mapeador do orçamento (Rede) domínio -> DTO HTTP (parte 1/US3). */

import type { Budget } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { BudgetResponseDto } from './schemas.ts';

export const budgetToDto = (budget: Budget): BudgetResponseDto => ({
  id: String(budget.id),
  partner: { kind: budget.partner.kind, ref: String(budget.partner.ref) },
  valueInCents: budget.value.cents,
});
