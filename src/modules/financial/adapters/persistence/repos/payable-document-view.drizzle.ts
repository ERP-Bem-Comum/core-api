// Adapter Drizzle do PayableDocumentView (#146): JOIN fin_payables × fin_documents
// para o gathering do export CSV-Nibo.
//
// Precedente: suggestion-view.drizzle.ts — mesmo padrão de JOIN intra-módulo, try/catch → Result,
// factory recebendo FinancialMysqlHandle.
// Precedente: payable-reconciliation-view.drizzle.ts — inArray para ids em conjunto + ids vazio → ok([]).
//
// ADR-0020 §"Features permitidas": JOIN é explicitamente permitido.
// ADR-0014: FK intra-módulo (finPayables.documentId → finDocuments.id) — JOIN físico ok.
// Sem JSON, sem ENUM nativo, sem cross-módulo.

import { inArray, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  PayableDocumentRow,
  PayableDocumentView,
  PayableDocumentViewError,
} from '#src/modules/financial/application/ports/payable-document-view.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finPayables, finDocuments } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-payable-document-view] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzlePayableDocumentView = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PayableDocumentView => {
  const { db } = handle;

  return {
    findByPayableIds: async (
      ids: readonly string[],
    ): Promise<Result<readonly PayableDocumentRow[], PayableDocumentViewError>> => {
      // ids vazio → ok([]) sem ir ao banco (padrão: payable-reconciliation-view.drizzle.ts:43).
      if (ids.length === 0) return ok([]);

      try {
        // INNER JOIN: só retorna linhas onde finPayables.documentId NÃO é null e o documento existe.
        // finPayables.documentId é NOT NULL no schema (mysql.ts:207), portanto o INNER JOIN é seguro.
        // Projeção plana — campos de documento são todos nullable no schema: supplierRef, documentNumber,
        // dueDate, categoryRef, costCenterRef, competencia, payeeKind.
        const rows = await db
          .select({
            payableId: finPayables.id,
            documentId: finDocuments.id,
            supplierRef: finDocuments.supplierRef,
            documentNumber: finDocuments.documentNumber,
            dueDate: finDocuments.dueDate,
            categoryRef: finDocuments.categoryRef,
            costCenterRef: finDocuments.costCenterRef,
            competencia: finDocuments.competencia,
            payeeKind: finDocuments.payeeKind,
          })
          .from(finPayables)
          .innerJoin(finDocuments, eq(finPayables.documentId, finDocuments.id))
          .where(inArray(finPayables.id, [...ids]));

        return ok(rows);
      } catch (cause) {
        logStore('findByPayableIds', cause);
        return err('payable-document-view-failure');
      }
    },
  };
};
