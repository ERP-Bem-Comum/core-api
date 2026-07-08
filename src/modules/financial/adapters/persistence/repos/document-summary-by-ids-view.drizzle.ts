// Adapter Drizzle do DocumentSummaryByIdsView (#358): SELECT ... FROM fin_documents
// LEFT JOIN recon (derivação de conciliação, ADR-0022) LEFT JOIN fin_supplier_view (fornecedor local).
//
// Precedente de projeção + displayStatus derivado: document-repository.drizzle.ts §findPaged — mesma
// subquery `recon` (count/sum agrupado por documento) + `case when isReconciled then 'Reconciled' else
// fin_documents.status end`. Reusar a MESMA derivação evita status divergente entre grid e batch.
// Precedente de busca por conjunto de ids + ids vazio → ok([]): payable-summary-by-ids-view.drizzle.ts (#357).
//
// ADR-0020 §"Features permitidas": JOIN (LEFT), `inArray` (IN), GROUP BY/agregação, CASE — todos permitidos.
// ADR-0043: fin_supplier_view é read-model cross-módulo (sem FK física) — LEFT JOIN por supplierRef.
// Boundary: try/catch → Result (.claude/rules/adapters.md).

import { inArray, eq, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  DocumentSummaryRow,
  DocumentSummaryByIdsView,
  DocumentSummaryByIdsViewError,
} from '#src/modules/financial/application/ports/document-summary-by-ids-view.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finDocuments, finPayables, finSupplierView } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-document-summary-by-ids-view] ${op} failed: ${String(cause)}\n`);
};

type SelectedRow = Readonly<{
  documentId: string;
  documentNumber: string | null;
  type: string | null;
  status: string;
  supplierRef: string | null;
  netValueCents: number | null;
  dueDate: Date | null;
  supplierName: string | null;
  supplierDocument: string | null;
}>;

// Mapper row → Result (estilo payable-summary-by-ids-view.drizzle §toPayableSummaryRow). Projeção casa
// 1:1 com DocumentSummaryRow — status/type trafegam como string crua no contrato. Guarda mínima:
// `dueDate`, quando presente, deve ser Date (defesa contra drift de tipo do driver mysql2 em datas cruas).
const toDocumentSummaryRow = (
  row: SelectedRow,
): Result<DocumentSummaryRow, DocumentSummaryByIdsViewError> => {
  if (row.dueDate !== null && !(row.dueDate instanceof Date)) {
    return err('document-summary-by-ids-view-failure');
  }

  return ok({
    documentId: row.documentId,
    documentNumber: row.documentNumber,
    type: row.type,
    status: row.status,
    supplierRef: row.supplierRef,
    netValueCents: row.netValueCents,
    dueDate: row.dueDate,
    supplierName: row.supplierName,
    supplierDocument: row.supplierDocument,
  });
};

export const createDrizzleDocumentSummaryByIdsView = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): DocumentSummaryByIdsView => {
  const { db } = handle;

  return {
    getDocumentsSummaryByIds: async (
      refs: readonly string[],
    ): Promise<Result<readonly DocumentSummaryRow[], DocumentSummaryByIdsViewError>> => {
      // refs vazio → ok([]) sem ir ao banco (padrão: payable-summary-by-ids-view.drizzle:79).
      if (refs.length === 0) return ok([]);

      try {
        // Derivação de conciliação (ADR-0022 — read-model DERIVADO, sem escrita em fin_documents):
        // por documento, total de títulos e quantos Reconciled. Subquery agrupada → LEFT JOIN 1:0..1.
        const recon = db
          .select({
            documentId: finPayables.documentId,
            total: sql<number>`count(*)`.as('total'),
            reconciled: sql<number>`sum(${finPayables.status} = 'Reconciled')`.as('reconciled'),
          })
          .from(finPayables)
          .groupBy(finPayables.documentId)
          .as('recon');

        // Documento conta como Conciliado sse status='Paid' E tem ≥1 título E TODOS Reconciled (FR-004).
        const isReconciled = sql`${finDocuments.status} = 'Paid' and ${recon.total} is not null and ${recon.total} = ${recon.reconciled}`;
        const displayStatus = sql<string>`case when ${isReconciled} then 'Reconciled' else ${finDocuments.status} end`;

        const rows = await db
          .select({
            documentId: finDocuments.id,
            documentNumber: finDocuments.documentNumber,
            type: finDocuments.type,
            status: displayStatus,
            supplierRef: finDocuments.supplierRef,
            netValueCents: finDocuments.netValue,
            dueDate: finDocuments.dueDate,
            supplierName: finSupplierView.name,
            supplierDocument: finSupplierView.document,
          })
          .from(finDocuments)
          .leftJoin(recon, eq(recon.documentId, finDocuments.id))
          .leftJoin(finSupplierView, eq(finDocuments.supplierRef, finSupplierView.supplierRef))
          .where(inArray(finDocuments.id, [...refs]));

        const items: DocumentSummaryRow[] = [];
        for (const row of rows) {
          const mapped = toDocumentSummaryRow(row);
          if (!mapped.ok) {
            logStore('getDocumentsSummaryByIds:map', mapped.error);
            return err('document-summary-by-ids-view-failure');
          }
          items.push(mapped.value);
        }
        return ok(items);
      } catch (cause) {
        logStore('getDocumentsSummaryByIds', cause);
        return err('document-summary-by-ids-view-failure');
      }
    },
  };
};
