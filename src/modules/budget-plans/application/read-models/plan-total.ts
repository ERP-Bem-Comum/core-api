import type { BudgetPlan } from '../../domain/budget-plan/types.ts';
import type { BudgetId } from '../../domain/shared/budget-id.ts';

// #458 — total do plano = soma dos lançamentos (bgp_budget_results) dos seus orçamentos.
//
// Puro: recebe o mapa budgetId → soma (produzido em lote por `BudgetResultRepository.sumByBudgetIds`)
// e agrega os orçamentos DESTE plano. Vive no application porque cruza dois agregados do módulo —
// o `BudgetPlan` conhece seus `budgets`, mas não os lançamentos. Orçamento sem entrada no mapa conta
// 0 (distinguível de "não informado" — CA3).
export const planTotalCents = (
  plan: BudgetPlan,
  sumsByBudget: ReadonlyMap<string, number>,
): number => plan.budgets.reduce((acc, b) => acc + (sumsByBudget.get(String(b.id)) ?? 0), 0);

// Coleta os ids dos orçamentos de um conjunto de planos — a entrada do `sumByBudgetIds` em lote,
// que evita o N+1 na lista.
export const budgetIdsOf = (plans: readonly BudgetPlan[]): readonly BudgetId[] =>
  plans.flatMap((p) => p.budgets.map((b) => b.id));
