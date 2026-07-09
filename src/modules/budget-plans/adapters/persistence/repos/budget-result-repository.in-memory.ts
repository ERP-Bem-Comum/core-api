import { ok } from '../../../../../shared/primitives/result.ts';
import type { BudgetId } from '../../../domain/shared/budget-id.ts';
import type { BudgetResult } from '../../../domain/budget-result/budget-result.ts';
import type { BudgetResultRepository } from '../../../domain/budget-result/repository.ts';

export type InMemoryBudgetResultRepositoryHandle = Readonly<{
  repo: BudgetResultRepository;
  all: () => readonly BudgetResult[];
}>;

export const InMemoryBudgetResultRepository = (): InMemoryBudgetResultRepositoryHandle => {
  let store: BudgetResult[] = [];

  const repo: BudgetResultRepository = {
    add: async (result: BudgetResult) => {
      store.push(result);
      return ok(undefined);
    },

    listByBudgetId: async (budgetId: BudgetId) =>
      ok(store.filter((r) => String(r.budgetId) === String(budgetId))),

    deleteByBudgetId: async (budgetId: BudgetId) => {
      store = store.filter((r) => String(r.budgetId) !== String(budgetId));
      return ok(undefined);
    },
  };

  return { repo, all: () => store };
};
