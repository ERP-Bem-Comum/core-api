import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import type { BudgetPlan } from '../../domain/budget-plan/types.ts';
import type { BudgetId } from '../../domain/shared/budget-id.ts';

/**
 * Soma valores monetários por {@link Money.add}.
 *
 * @param values - Parcelas.
 * @returns A soma, {@link Money.ZERO} sem parcelas; `'money-exceeds-safe-integer'` quando a soma
 *   passa de `Number.MAX_SAFE_INTEGER`.
 */
export const sumMoney = (
  values: Iterable<Money.Money>,
): Result<Money.Money, 'money-exceeds-safe-integer'> => {
  let total: Money.Money = Money.ZERO;
  for (const value of values) {
    const next = Money.add(total, value);
    if (!next.ok) return next;
    total = next.value;
  }
  return ok(total);
};

/** Erro de {@link planTotal}. */
export type PlanTotalError = 'budget-plan-total-exceeds-safe-integer';

/**
 * Total do plano: soma, pelos orçamentos do plano, das entradas do mapa id do orçamento → soma.
 * Orçamento sem entrada no mapa conta zero; entrada de orçamento de outro plano é ignorada.
 *
 * @param plan - Plano cujos orçamentos são somados.
 * @param sumsByBudget - Soma dos lançamentos por id de orçamento.
 * @returns O total; `'budget-plan-total-exceeds-safe-integer'` quando ele passa de
 *   `Number.MAX_SAFE_INTEGER`.
 */
export const planTotal = (
  plan: BudgetPlan,
  sumsByBudget: ReadonlyMap<string, Money.Money>,
): Result<Money.Money, PlanTotalError> => {
  const total = sumMoney(plan.budgets.map((b) => sumsByBudget.get(String(b.id)) ?? Money.ZERO));
  return total.ok ? total : err('budget-plan-total-exceeds-safe-integer');
};

// Coleta os ids dos orçamentos de um conjunto de planos — a entrada do `sumByBudgetIds` em lote,
// que evita o N+1 na lista.
export const budgetIdsOf = (plans: readonly BudgetPlan[]): readonly BudgetId[] =>
  plans.flatMap((p) => p.budgets.map((b) => b.id));
