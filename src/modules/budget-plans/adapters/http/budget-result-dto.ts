/**
 * Mapeador do lançamento calculado (domínio) -> DTO HTTP (US3/#317). Serializa branded ids como
 * string e o Money como `valueInCents` (inteiro). Usado nas respostas 201 dos 4 POSTs de cálculo.
 */

import type { BudgetResult } from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import type { BudgetResultResponseDto } from './schemas.ts';

export const budgetResultToDto = (result: BudgetResult): BudgetResultResponseDto => ({
  id: String(result.id),
  budgetId: String(result.budgetId),
  subcategoryId: String(result.subcategoryId),
  // #413 — sem o mês na saída o front não monta o grid: o dado existiria no banco e sumiria na borda.
  month: result.month,
  model: result.model,
  valueInCents: result.value.cents,
});
