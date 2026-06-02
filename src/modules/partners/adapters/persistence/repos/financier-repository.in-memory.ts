/**
 * Adapter InMemory do `FinancierRepository` (módulo partners). Para teste/CLI.
 *
 * `Map<FinancierId, Financier>`. `save` recusa CNPJ duplicado com id diferente
 * (espelha o UNIQUE de `par_financiers.cnpj` que o adapter Drizzle terá).
 * `findByCnpj` por varredura (cardinalidade modesta — ADR-0031).
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type { FinancierRepository } from '#src/modules/partners/domain/financier/repository.ts';
import type { FinancierId } from '#src/modules/partners/domain/financier/financier-id.ts';
import type { Financier } from '#src/modules/partners/domain/financier/types.ts';

export type InMemoryFinancierStore = Readonly<{
  repository: FinancierRepository;
  clear: () => void;
}>;

export const makeInMemoryFinancierStore = (): InMemoryFinancierStore => {
  const map = new Map<FinancierId, Financier>();

  const repository: FinancierRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findByCnpj: async (cnpj) => ok([...map.values()].find((f) => f.cnpj === cnpj) ?? null),
    list: async () => ok([...map.values()]),
    save: async (financier) => {
      for (const existing of map.values()) {
        if (existing.cnpj === financier.cnpj && existing.id !== financier.id) {
          return err('financier-cnpj-duplicate');
        }
      }
      map.set(financier.id, financier);
      return ok(undefined);
    },
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
