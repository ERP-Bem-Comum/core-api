/**
 * Adapter InMemory do `SupplierRepository` (módulo partners). Para teste/CLI.
 *
 * `Map<SupplierId, Supplier>`. `save` recusa CNPJ duplicado com id diferente
 * (espelha o UNIQUE de `par_suppliers.cnpj` que o adapter Drizzle terá).
 * `findByCnpj` por varredura (cardinalidade modesta — ADR-0031).
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type { SupplierRepository } from '#src/modules/partners/domain/supplier/repository.ts';
import type { SupplierId } from '#src/modules/partners/domain/supplier/supplier-id.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';

export type InMemorySupplierStore = Readonly<{
  repository: SupplierRepository;
  clear: () => void;
}>;

export const makeInMemorySupplierStore = (): InMemorySupplierStore => {
  const map = new Map<SupplierId, Supplier>();

  const repository: SupplierRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findByCnpj: async (cnpj) => ok([...map.values()].find((s) => s.cnpj === cnpj) ?? null),
    list: async () => ok([...map.values()]),
    save: async (supplier) => {
      for (const existing of map.values()) {
        if (existing.cnpj === supplier.cnpj && existing.id !== supplier.id) {
          return err('supplier-cnpj-duplicate');
        }
      }
      map.set(supplier.id, supplier);
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
