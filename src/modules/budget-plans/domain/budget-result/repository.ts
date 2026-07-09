import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetId } from '../shared/budget-id.ts';
import type { BudgetResult } from './budget-result.ts';

// Port de persistência do lançamento calculado. Sem outbox (esta fatia não emite evento — YAGNI).
export type BudgetResultRepositoryError =
  | 'budget-result-repo-unavailable'
  | 'budget-result-corrupt';

export type BudgetResultRepository = Readonly<{
  add: (result: BudgetResult) => Promise<Result<void, BudgetResultRepositoryError>>;
  // CA3 (leitura por orçamento) + round-trip. Ordem determinística (por id) fica a cargo do adapter.
  listByBudgetId: (
    budgetId: BudgetId,
  ) => Promise<Result<readonly BudgetResult[], BudgetResultRepositoryError>>;
  // CA4: apagar o orçamento remove seus resultados (delete explícito, D2 — sem FK cascade).
  deleteByBudgetId: (budgetId: BudgetId) => Promise<Result<void, BudgetResultRepositoryError>>;
}>;
