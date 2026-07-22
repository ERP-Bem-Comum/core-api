/**
 * FinancialEtlStore (Drizzle) — correlação `fin_documents.legacy_id` (ETL-FINANCIAL-WRITER).
 *
 * Lookup usa o UNIQUE `fin_documents_legacy_id_uq` (type=const). O mark é um UPDATE
 * de coluna de infra/proveniência BLINDADO (`WHERE id=? AND legacy_id IS NULL` +
 * affectedRows=1 — Refman 8.4 §13.2.17: "The affected-rows value reflects the number
 * of rows actually changed"); sobrescrita/no-op → 'financial-etl-store-conflict'.
 * `findOrphanCandidate` cobre a janela save→mark de runs parciais (adoção, não duplicação).
 */

import { and, eq, isNull } from 'drizzle-orm';
import process from 'node:process';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type {
  EtlDocumentRef,
  FinancialEtlStore,
  FinancialEtlStoreError,
} from '#src/modules/financial/application/ports/financial-etl-store.ts';
import { isDocumentStatus } from '#src/modules/financial/domain/payable-view/types.ts';
import { finDocuments } from '../schemas/mysql.ts';

const isDupEntry = (cause: unknown): boolean =>
  typeof cause === 'object' &&
  cause !== null &&
  'code' in cause &&
  (cause as Readonly<{ code: unknown }>).code === 'ER_DUP_ENTRY';

type RefRow = Readonly<{ id: string; status: string; version: number }>;

const toRef = (row: RefRow | undefined): Result<EtlDocumentRef | null, FinancialEtlStoreError> => {
  if (row === undefined) return ok(null);
  if (!isDocumentStatus(row.status)) return err('financial-etl-store-unavailable');
  return ok({ id: row.id, status: row.status, version: row.version });
};

export const createDrizzleFinancialEtlStore = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  handle: FinancialMysqlHandle,
): FinancialEtlStore => ({
  findDocumentByLegacyId: async (
    legacyId: number,
  ): Promise<Result<EtlDocumentRef | null, FinancialEtlStoreError>> => {
    try {
      const rows = await handle.db
        .select({
          id: finDocuments.id,
          status: finDocuments.status,
          version: finDocuments.version,
        })
        .from(finDocuments)
        .where(eq(finDocuments.legacyId, legacyId))
        .limit(1);
      return toRef(rows[0]);
    } catch (cause) {
      process.stderr.write(`[financial-etl-store:find] ${String(cause)}\n`);
      return err('financial-etl-store-unavailable');
    }
  },

  findOrphanCandidate: async (
    documentNumber: string,
    supplierRef: string | null,
    grossValueCents: number | null,
  ): Promise<Result<EtlDocumentRef | null, FinancialEtlStoreError>> => {
    try {
      const supplierCond =
        supplierRef === null
          ? isNull(finDocuments.supplierRef)
          : eq(finDocuments.supplierRef, supplierRef);
      // Refinamento anti-falso-positivo (W2 R2 sug.2): identifierCode repete em 15/52 —
      // o valor bruto entra no match p/ não adotar documento ORGÂNICO homônimo.
      const grossCond =
        grossValueCents === null
          ? isNull(finDocuments.grossValue)
          : eq(finDocuments.grossValue, grossValueCents);
      const rows = await handle.db
        .select({
          id: finDocuments.id,
          status: finDocuments.status,
          version: finDocuments.version,
        })
        .from(finDocuments)
        .where(
          and(
            isNull(finDocuments.legacyId),
            eq(finDocuments.documentNumber, documentNumber),
            supplierCond,
            grossCond,
          ),
        )
        .limit(1);
      return toRef(rows[0]);
    } catch (cause) {
      process.stderr.write(`[financial-etl-store:orphan] ${String(cause)}\n`);
      return err('financial-etl-store-unavailable');
    }
  },

  markDocumentLegacyId: async (
    documentId: string,
    legacyId: number,
  ): Promise<Result<void, FinancialEtlStoreError>> => {
    try {
      const updateResult = await handle.db
        .update(finDocuments)
        .set({ legacyId })
        .where(and(eq(finDocuments.id, documentId), isNull(finDocuments.legacyId)));
      const affectedRows = (updateResult as unknown as [{ affectedRows: number }])[0].affectedRows;
      if (affectedRows !== 1) return err('financial-etl-store-conflict');
      return ok(undefined);
    } catch (cause) {
      if (isDupEntry(cause)) return err('financial-etl-store-conflict');
      process.stderr.write(`[financial-etl-store:mark] ${String(cause)}\n`);
      return err('financial-etl-store-unavailable');
    }
  },
});
