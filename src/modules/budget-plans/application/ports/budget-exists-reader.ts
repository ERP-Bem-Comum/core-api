import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetId } from '../../domain/shared/budget-id.ts';

// Leitura focada (ISP): confirma que o orçamento existe antes de gravar um lançamento. Sem FK física
// (D1 — bgp_budgets sofre replace-all), esta é a rede de integridade do budgetId (D3).
export type BudgetExistsReadError = 'budget-not-found' | 'budget-reader-unavailable';

export type BudgetExistsReader = Readonly<{
  exists: (id: BudgetId) => Promise<Result<void, BudgetExistsReadError>>;
}>;
