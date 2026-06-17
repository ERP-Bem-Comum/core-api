import type { Result } from '#src/shared/primitives/result.ts';
import type { SupplierView } from '#src/modules/financial/domain/supplier-view/types.ts';

/**
 * SupplierViewStore — driven port do read-model de fornecedor (US2 #47).
 *
 * `upsert` aplica o snapshot com **guard de recência** (não regride se `occurredAt` for
 * mais antigo que o gravado) — absorve at-least-once e eventos fora de ordem (FR-003).
 * `get` resolve o fornecedor por `supplierRef` para a listagem (null quando ausente).
 */
export type SupplierViewStore = Readonly<{
  upsert: (view: SupplierView) => Promise<Result<void, SupplierViewStoreError>>;
  get: (supplierRef: string) => Promise<Result<SupplierView | null, SupplierViewStoreError>>;
}>;

export type SupplierViewStoreError = 'supplier-view-store-unavailable';
