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

  // Paridade com o drizzle (ON DUPLICATE KEY UPDATE sobre a UNIQUE): a chave natural é
  // (budgetId, subcategoryId, month) — #413.
  const sameTarget = (a: BudgetResult, b: BudgetResult): boolean =>
    String(a.budgetId) === String(b.budgetId) &&
    String(a.subcategoryId) === String(b.subcategoryId) &&
    a.month === b.month;

  const repo: BudgetResultRepository = {
    // Devolve o PERSISTIDO (não a entrada): no recálculo o id do chamador é descartado — mesma
    // semântica do ON DUPLICATE KEY UPDATE no drizzle (paridade).
    save: async (result: BudgetResult) => {
      const existing = store.findIndex((r) => sameTarget(r, result));
      if (existing === -1) {
        store.push(result);
        return ok(result);
      }
      // Recálculo: sobrescreve valor/modelo e PRESERVA o id da linha existente.
      const previous = store[existing];
      if (previous === undefined) return ok(result);
      const merged: BudgetResult = { ...result, id: previous.id };
      store[existing] = merged;
      return ok(merged);
    },

    listByBudgetId: async (budgetId: BudgetId) =>
      ok(store.filter((r) => String(r.budgetId) === String(budgetId))),

    // #458 — soma por orçamento (paridade do GROUP BY do drizzle). Só entra no mapa quem tem
    // lançamento; ids sem resultado ficam ausentes (o caller trata como 0). Lista vazia → mapa vazio.
    sumByBudgetIds: async (budgetIds: readonly BudgetId[]) => {
      const wanted = new Set(budgetIds.map((id) => String(id)));
      const sums = new Map<string, number>();
      for (const r of store) {
        const key = String(r.budgetId);
        if (!wanted.has(key)) continue;
        sums.set(key, (sums.get(key) ?? 0) + r.value.cents);
      }
      return ok(sums);
    },

    deleteByBudgetId: async (budgetId: BudgetId) => {
      store = store.filter((r) => String(r.budgetId) !== String(budgetId));
      return ok(undefined);
    },
  };

  return { repo, all: () => store };
};
