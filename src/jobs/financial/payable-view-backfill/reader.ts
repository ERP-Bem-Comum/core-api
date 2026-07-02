// Leitura da fonte-de-verdade para o backfill (#236): `fin_payables ⋈ fin_documents` → PayableView[].
// Adapter (drizzle) do composition root; separado de run.ts para ser testável na integração. Linha
// com enum fora do contrato ou dueDate ausente é pulada (não corrompe o read-model) e contada.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  finPayables,
  finDocuments,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import {
  type PayableView,
  isDocumentStatus,
  documentStatusToViewStatus,
} from '#src/modules/financial/domain/payable-view/types.ts';

export type BackfillSource = Readonly<{
  records: readonly PayableView[];
  skipped: number;
  total: number;
}>;

export type BackfillReadError = 'backfill-source-read-failed';

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const readPayableBackfillRecords = async (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Promise<Result<BackfillSource, BackfillReadError>> => {
  try {
    return ok(await readAll(handle));
  } catch (cause) {
    process.stderr.write(`[payable-view-backfill:read] ${String(cause)}\n`);
    return err('backfill-source-read-failed');
  }
};

async function readAll(
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  handle: FinancialMysqlHandle,
): Promise<BackfillSource> {
  const rows = await handle.db
    .select({
      payableId: finPayables.id,
      documentId: finPayables.documentId,
      kind: finPayables.kind,
      retentionType: finPayables.retentionType,
      valueCents: finPayables.value,
      dueDate: finPayables.dueDate,
      status: finPayables.status,
      paidAt: finPayables.paidAt,
      debitAccountRef: finDocuments.debitAccountRef,
      supplierRef: finDocuments.supplierRef,
      contractRef: finDocuments.contractRef,
      categoryRef: finDocuments.categoryRef,
      costCenterRef: finDocuments.costCenterRef,
      programRef: finDocuments.programRef,
    })
    .from(finPayables)
    .innerJoin(finDocuments, eq(finPayables.documentId, finDocuments.id));

  const records: PayableView[] = [];
  let skipped = 0;
  for (const row of rows) {
    if (!isDocumentStatus(row.status) || !(row.dueDate instanceof Date)) {
      skipped += 1;
      continue;
    }
    records.push({
      payableId: row.payableId,
      documentId: row.documentId,
      kind: row.kind === 'Child' ? 'Child' : 'Parent',
      retentionType: row.retentionType,
      supplierRef: row.supplierRef,
      contractRef: row.contractRef,
      categoryRef: row.categoryRef,
      costCenterRef: row.costCenterRef,
      programRef: row.programRef,
      valueCents: row.valueCents,
      dueDate: toIsoDate(row.dueDate),
      status: documentStatusToViewStatus(row.status),
      // #239: colunas adicionadas à view; backfill repõe da fonte de verdade.
      debitAccountRef: row.debitAccountRef,
      paidAt: row.paidAt instanceof Date ? toIsoDate(row.paidAt) : null,
    });
  }
  return { records, skipped, total: rows.length };
}
