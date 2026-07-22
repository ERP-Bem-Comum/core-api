/**
 * Adapter InMemory do `SuppliersBatchReadPort` (#356) — teste/dev. Semeia a partir do
 * mesmo `SupplierReadRecord[]` usado pelo `SupplierReader` (memory driver, `composition.ts`).
 * Espelha `supplier-reader.in-memory.ts`.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type {
  SuppliersBatchReadPort,
  SupplierBatchView,
} from '#src/modules/partners/application/ports/suppliers-batch-read.ts';
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';

export const makeInMemorySuppliersBatchReader = (
  seed: readonly SupplierReadRecord[] = [],
): SuppliersBatchReadPort => {
  const byRef = new Map(seed.map((rec) => [String(rec.supplier.id), rec.supplier]));

  return {
    getSuppliersView: async (refs) => {
      const items: SupplierBatchView[] = [];
      const missing: string[] = [];
      for (const ref of refs) {
        const supplier = byRef.get(ref);
        if (supplier === undefined) {
          missing.push(ref);
          continue;
        }
        items.push({
          ref,
          name: supplier.name,
          taxId: String(supplier.cnpj),
          serviceCategory: supplier.serviceCategory,
        });
      }
      return ok({ items, missing });
    },
  };
};
