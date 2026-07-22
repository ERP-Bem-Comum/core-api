import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { BudgetId } from '../../../domain/shared/budget-id.ts';
import type { BudgetExistsReader } from '../../../application/ports/budget-exists-reader.ts';

// Existe se: (a) está no seed de ids OU (b) algum plano do store o contém (`fromStore`) — #458.
// O (b) mantém o reader em paridade com o drizzle (que lê bgp_budgets): um orçamento criado via
// POST passa a ser reconhecido para lançar. O seed (a) segue valendo para testes que não criam plano.
export const InMemoryBudgetExistsReader = (
  existing: readonly string[],
  fromStore: (budgetId: string) => boolean = () => false,
): BudgetExistsReader => {
  const set = new Set(existing);
  return {
    exists: async (id: BudgetId) =>
      set.has(String(id)) || fromStore(String(id)) ? ok(undefined) : err('budget-not-found'),
  };
};
