/**
 * Adapter InMemory do `SupplierReader` (módulo partners) — teste/CLI.
 * Store semeável de read-records. Espelha `collaborator-reader.in-memory.ts`.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type {
  SupplierReader,
  SupplierReadRecord,
} from '#src/modules/partners/application/ports/supplier-reader.ts';
import type { SupplierId } from '#src/modules/partners/domain/supplier/supplier-id.ts';

export const makeInMemorySupplierReader = (
  seed: readonly SupplierReadRecord[] = [],
): SupplierReader => {
  const map = new Map<SupplierId, SupplierReadRecord>();
  for (const record of seed) map.set(record.supplier.id, record);

  return {
    getById: async (id) => ok(map.get(id) ?? null),
    list: async () => ok([...map.values()]),
  };
};
