/**
 * Adapter InMemory do `SupplierViewStore` (read-model de fornecedor — US2 #47). Para teste/CLI.
 * `Map<supplierRef, SupplierView>` com guard de recência por `occurredAt` (espelha o
 * `ON DUPLICATE KEY UPDATE ... IF(occurred_at >= ...)` do adapter Drizzle).
 */
import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  SupplierViewStore,
  SupplierViewStoreError,
} from '#src/modules/financial/application/ports/supplier-view-store.ts';
import type { SupplierView } from '#src/modules/financial/domain/supplier-view/types.ts';

export const createInMemorySupplierViewStore = (): SupplierViewStore => {
  const map = new Map<string, SupplierView>();

  return {
    upsert: async (view): Promise<Result<void, SupplierViewStoreError>> => {
      const current = map.get(view.supplierRef);
      // Guard de recência: aplica só se for o primeiro ou >= o gravado (não regride).
      if (current === undefined || view.occurredAt.getTime() >= current.occurredAt.getTime()) {
        map.set(view.supplierRef, view);
      }
      return Promise.resolve(ok(undefined));
    },
    get: async (supplierRef): Promise<Result<SupplierView | null, SupplierViewStoreError>> =>
      Promise.resolve(ok(map.get(supplierRef) ?? null)),
  };
};
