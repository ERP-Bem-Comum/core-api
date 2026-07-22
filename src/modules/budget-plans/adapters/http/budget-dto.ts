/** Mapeador do orçamento (Rede) domínio -> DTO HTTP (parte 1/US3). */

import type { Budget } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { BudgetResponseDto } from './schemas.ts';

// #458 — `valueInCents` é DERIVADO (soma dos lançamentos daquela Rede), passado pelo caller. Um
// orçamento recém-criado ainda não tem lançamento → 0. O `Budget` do domínio não carrega mais valor.
export const budgetToDto = (budget: Budget, valueInCents: number): BudgetResponseDto => ({
  id: String(budget.id),
  partner: { kind: budget.partner.kind, ref: String(budget.partner.ref) },
  valueInCents,
});
