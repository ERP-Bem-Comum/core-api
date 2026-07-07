// Adapter in-memory do PayableSummaryByIdsView (#357).
//
// Recebe um thunk lazy `() => readonly PayableSummaryRow[]` — mesmo padrão de
// payable-document-view.in-memory.ts §"source: () => readonly PayableDocumentRow[]" — para que a
// composition in-memory derive as rows de documentStore/payableStore (denormalizadas) DEPOIS do seed.
//
// Driver memory: supplierName/supplierDocument vêm null no thunk fornecido pela composition (read-model
// de fornecedor vazio sem worker — mesma nota do 000-request.md §"Driver memory nos testes de borda").
//
// Espelha a semântica do adapter Drizzle: refs vazio → ok([]) sem processamento;
// ref inexistente → ausente no resultado (degradação graciosa).

import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { PayableListItem } from '#src/modules/financial/domain/payable/query.ts';
import type {
  PayableSummaryRow,
  PayableSummaryByIdsView,
  PayableSummaryByIdsViewError,
} from '#src/modules/financial/application/ports/payable-summary-by-ids-view.ts';

// `PayableSummaryRow` é um subset de `PayableListItem` (+ supplierName/supplierDocument, que no
// driver memory ficam null — read-model de fornecedor vazio sem worker). Reusa a derivação
// canônica de `payable-list-view.in-memory.ts` (`derivePayableListItems`) em vez de reimplementar
// o loop `LoadedDocument → [parent, ...children]`.
export const payableListItemToSummaryRow = (item: PayableListItem): PayableSummaryRow => ({
  payableId: item.payableId,
  documentId: item.documentId,
  documentNumber: item.documentNumber,
  documentType: item.documentType,
  valueCents: item.valueCents,
  dueDate: item.dueDate,
  status: item.status,
  paymentMethod: item.paymentMethod,
  supplierRef: item.supplierRef,
  supplierName: null,
  supplierDocument: null,
});

export const createInMemoryPayableSummaryByIdsView = (
  getRows: () => readonly PayableSummaryRow[],
): PayableSummaryByIdsView => ({
  getPayablesSummaryByIds: async (
    refs: readonly string[],
  ): Promise<Result<readonly PayableSummaryRow[], PayableSummaryByIdsViewError>> => {
    if (refs.length === 0) return ok([]);

    const rows = getRows();
    const refSet = new Set(refs);
    const filtered = rows.filter((row) => refSet.has(row.payableId));
    return ok(filtered);
  },
});
