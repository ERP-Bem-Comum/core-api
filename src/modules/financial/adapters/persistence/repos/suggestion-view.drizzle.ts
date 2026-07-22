// Adapter Drizzle do SuggestionView: títulos `Paid` + favorecido (fin_supplier_view) + nº doc (fin_documents).
// Read-only; boundary try/catch → Result. supplierOpenCount é derivado no use-case a partir da lista.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  SuggestionCandidate,
  SuggestionView,
  SuggestionViewError,
} from '#src/modules/financial/application/ports/suggestion-view.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finDocuments, finPayables, finSupplierView } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-suggestion-view] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzleSuggestionView = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): SuggestionView => {
  const { db } = handle;

  return {
    listCandidates: async (): Promise<
      Result<readonly SuggestionCandidate[], SuggestionViewError>
    > => {
      try {
        const rows = await db
          .select({
            payableId: finPayables.id,
            valueCents: finPayables.value,
            dueDate: finPayables.dueDate,
            paidAt: finPayables.paidAt,
            supplierRef: finDocuments.supplierRef,
            supplierName: finSupplierView.name,
            documentNumber: finDocuments.documentNumber,
          })
          .from(finPayables)
          .innerJoin(finDocuments, eq(finPayables.documentId, finDocuments.id))
          .leftJoin(finSupplierView, eq(finDocuments.supplierRef, finSupplierView.supplierRef))
          .where(eq(finPayables.status, 'Paid'));

        return ok(
          rows.map((r) => ({
            payableId: r.payableId,
            valueCents: r.valueCents,
            dueDate: r.dueDate,
            paidAt: r.paidAt,
            supplierRef: r.supplierRef,
            supplierName: r.supplierName,
            documentNumber: r.documentNumber,
          })),
        );
      } catch (cause) {
        logStore('listCandidates', cause);
        return err('suggestion-view-failure');
      }
    },
  };
};
