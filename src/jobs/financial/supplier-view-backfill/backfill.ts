/**
 * Lógica pura do backfill do read-model de fornecedor (US2 #47). Aplica cada fornecedor existente
 * no `SupplierViewStore` com um `occurredAt` ANTIGO — assim eventos reais (mais novos) sempre vencem
 * o guard de recência do store (não regride). Idempotente por re-execução. Testável sem DB.
 */
import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { SupplierViewStore } from '#src/modules/financial/application/ports/supplier-view-store.ts';

export type SupplierBackfillRecord = Readonly<{
  supplierRef: string;
  name: string;
  document: string;
}>;

export type BackfillResult = Readonly<{ applied: number; failed: number }>;

export const backfillSupplierViews = async (
  records: readonly SupplierBackfillRecord[],
  store: SupplierViewStore,
  occurredAt: Date,
): Promise<Result<BackfillResult, never>> => {
  let applied = 0;
  let failed = 0;
  for (const record of records) {
    const result = await store.upsert({
      supplierRef: record.supplierRef,
      name: record.name,
      document: record.document,
      occurredAt,
    });
    if (result.ok) applied += 1;
    else failed += 1;
  }
  return ok({ applied, failed });
};
