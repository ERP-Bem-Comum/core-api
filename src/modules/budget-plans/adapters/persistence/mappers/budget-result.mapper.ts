import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import { isLaunchType } from '#src/modules/budget-plans/domain/cost-structure/launch-type.ts';
import type { BudgetResult } from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import type * as schema from '../schemas/mysql.ts';

// Row inválida vinda do banco (id fora do formato, model fora do enum, cents negativo/overflow) é
// corrupção — o domínio rejeita via smart constructors. Um único erro opaco (adapters.md).
export type BudgetResultMapperError = 'budget-result-corrupt';

type BudgetResultRow = typeof schema.budgetResults.$inferSelect;
type NewBudgetResultRow = typeof schema.budgetResults.$inferInsert;

export const budgetResultToInsert = (result: BudgetResult): NewBudgetResultRow => ({
  id: result.id as unknown as string,
  budgetId: result.budgetId as unknown as string,
  subcategoryId: result.subcategoryId as unknown as string,
  month: result.month as unknown as number,
  model: result.model,
  valueCents: result.value.cents,
});

/**
 * Converte as linhas de `SUM(value_cents) ... GROUP BY budget_id`, que o mysql2 entrega como string,
 * no mapa id do orçamento → soma.
 *
 * @param rows - Uma linha por orçamento, com a soma em texto decimal.
 * @returns O mapa, com uma entrada por linha; `'budget-result-sum-exceeds-safe-integer'` quando uma
 *   soma passa de `Number.MAX_SAFE_INTEGER`; `'budget-result-corrupt'` quando uma soma é negativa ou
 *   não é inteira.
 */
export const budgetSumsFromRows = (
  rows: readonly Readonly<{ budgetId: string; sumCents: string }>[],
): Result<
  ReadonlyMap<string, Money.Money>,
  'budget-result-sum-exceeds-safe-integer' | BudgetResultMapperError
> => {
  const sums = new Map<string, Money.Money>();
  for (const row of rows) {
    const sum = Money.fromCents(Number(row.sumCents));
    if (!sum.ok) {
      return err(
        sum.error === 'money-exceeds-safe-integer'
          ? 'budget-result-sum-exceeds-safe-integer'
          : 'budget-result-corrupt',
      );
    }
    sums.set(row.budgetId, sum.value);
  }
  return ok(sums);
};

export const budgetResultFromRow = (
  row: Readonly<BudgetResultRow>,
): Result<BudgetResult, BudgetResultMapperError> => {
  const id = BudgetResultId.rehydrate(row.id);
  if (!id.ok) return err('budget-result-corrupt');

  const budgetId = BudgetId.rehydrate(row.budgetId);
  if (!budgetId.ok) return err('budget-result-corrupt');

  const subcategoryId = SubcategoryId.rehydrate(row.subcategoryId);
  if (!subcategoryId.ok) return err('budget-result-corrupt');

  // Mês fora de 1..12 é corrupção — o domínio não confia no banco, mesmo com o CHECK no lugar.
  const month = ExerciseMonth.rehydrate(row.month);
  if (!month.ok) return err('budget-result-corrupt');

  if (!isLaunchType(row.model)) return err('budget-result-corrupt');

  const value = Money.fromCents(row.valueCents);
  if (!value.ok) return err('budget-result-corrupt');

  return ok({
    id: id.value,
    budgetId: budgetId.value,
    subcategoryId: subcategoryId.value,
    month: month.value,
    model: row.model,
    value: value.value,
  });
};
