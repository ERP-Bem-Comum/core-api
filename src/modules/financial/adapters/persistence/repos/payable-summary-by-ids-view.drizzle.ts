// Adapter Drizzle do PayableSummaryByIdsView (#357): SELECT ... FROM fin_payables
// INNER JOIN fin_documents (documento dono) LEFT JOIN fin_supplier_view (fornecedor local).
//
// Precedente de JOIN: payable-list-view.drizzle.ts — mesmo `finPayables INNER JOIN finDocuments`.
// Precedente de LEFT JOIN + fin_supplier_view: suggestion-view.drizzle.ts (join por `supplierRef`,
// projeção nullable automática do Drizzle em colunas do lado LEFT).
// Precedente de busca por conjunto de ids: payable-document-view.drizzle.ts — `inArray` + ids vazio
// → ok([]) sem ir ao banco.
//
// ADR-0020 §"Features permitidas": JOIN (INNER e LEFT) é explicitamente permitido; `inArray` (IN) também.
// ADR-0014: FK intra-módulo (finPayables.documentId → finDocuments.id) — JOIN físico ok. fin_supplier_view
// não tem FK física (read-model cross-módulo via outbox — ADR-0043).
// Boundary: try/catch → Result (.claude/rules/adapters.md).

import { inArray, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  PayableSummaryRow,
  PayableSummaryByIdsView,
  PayableSummaryByIdsViewError,
} from '#src/modules/financial/application/ports/payable-summary-by-ids-view.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finPayables, finDocuments, finSupplierView } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-payable-summary-by-ids-view] ${op} failed: ${String(cause)}\n`);
};

type SelectedRow = Readonly<{
  payableId: string;
  documentId: string;
  documentNumber: string | null;
  documentType: string | null;
  valueCents: number;
  dueDate: Date;
  status: string;
  paymentMethod: string | null;
  supplierRef: string | null;
  supplierName: string | null;
  supplierDocument: string | null;
}>;

// Mapper row → Result (estilo payable-list.mapper.ts). A projeção já casa 1:1 com PayableSummaryRow —
// não há enum de domínio a revalidar aqui (status/documentType trafegam como string crua no contrato,
// diferente de PayableListItem). Guarda mínima: `dueDate` sempre presente (coluna NOT NULL no schema),
// defesa contra drift de tipo do driver mysql2 (datas cruas de MySQL).
const toPayableSummaryRow = (
  row: SelectedRow,
): Result<PayableSummaryRow, PayableSummaryByIdsViewError> => {
  if (!(row.dueDate instanceof Date)) return err('payable-summary-by-ids-view-failure');

  return ok({
    payableId: row.payableId,
    documentId: row.documentId,
    documentNumber: row.documentNumber,
    documentType: row.documentType,
    valueCents: row.valueCents,
    dueDate: row.dueDate,
    status: row.status,
    paymentMethod: row.paymentMethod,
    supplierRef: row.supplierRef,
    supplierName: row.supplierName,
    supplierDocument: row.supplierDocument,
  });
};

export const createDrizzlePayableSummaryByIdsView = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PayableSummaryByIdsView => {
  const { db } = handle;

  return {
    getPayablesSummaryByIds: async (
      refs: readonly string[],
    ): Promise<Result<readonly PayableSummaryRow[], PayableSummaryByIdsViewError>> => {
      // refs vazio → ok([]) sem ir ao banco (padrão: payable-document-view.drizzle.ts:38).
      if (refs.length === 0) return ok([]);

      try {
        const rows = await db
          .select({
            payableId: finPayables.id,
            documentId: finPayables.documentId,
            documentNumber: finDocuments.documentNumber,
            documentType: finDocuments.type,
            valueCents: finPayables.value,
            dueDate: finPayables.dueDate,
            status: finPayables.status,
            paymentMethod: finDocuments.paymentMethod,
            supplierRef: finDocuments.supplierRef,
            supplierName: finSupplierView.name,
            supplierDocument: finSupplierView.document,
          })
          .from(finPayables)
          .innerJoin(finDocuments, eq(finPayables.documentId, finDocuments.id))
          .leftJoin(finSupplierView, eq(finDocuments.supplierRef, finSupplierView.supplierRef))
          .where(inArray(finPayables.id, [...refs]));

        const items: PayableSummaryRow[] = [];
        for (const row of rows) {
          const mapped = toPayableSummaryRow(row);
          if (!mapped.ok) {
            logStore('getPayablesSummaryByIds:map', mapped.error);
            return err('payable-summary-by-ids-view-failure');
          }
          items.push(mapped.value);
        }
        return ok(items);
      } catch (cause) {
        logStore('getPayablesSummaryByIds', cause);
        return err('payable-summary-by-ids-view-failure');
      }
    },
  };
};
