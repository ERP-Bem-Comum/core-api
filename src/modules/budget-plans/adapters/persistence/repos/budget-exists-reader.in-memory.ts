import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { BudgetId } from '../../../domain/shared/budget-id.ts';
import type { BudgetExistsReader } from '../../../application/ports/budget-exists-reader.ts';

// Seed = ids (string) dos orçamentos existentes. Ausência -> budget-not-found (paridade com o
// SELECT real que não acha a linha em bgp_budgets).
export const InMemoryBudgetExistsReader = (existing: readonly string[]): BudgetExistsReader => {
  const set = new Set(existing);
  return {
    exists: async (id: BudgetId) => (set.has(String(id)) ? ok(undefined) : err('budget-not-found')),
  };
};
