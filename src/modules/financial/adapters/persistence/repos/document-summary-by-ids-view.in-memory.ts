// Adapter in-memory do DocumentSummaryByIdsView (#358).
//
// Recebe um thunk lazy `() => readonly DocumentSummaryRow[]` — mesmo padrão de
// payable-summary-by-ids-view.in-memory.ts §"getRows: () => readonly PayableSummaryRow[]" — para que a
// composition in-memory derive as rows de documentStore (via documentSource) DEPOIS do seed.
//
// Driver memory: supplierName/supplierDocument vêm null (read-model de fornecedor vazio sem worker);
// `status` é o cru do documento (paridade com o grid in-memory `toListItem`, que também não deriva
// 'Reconciled' — a derivação real só existe no adapter Drizzle).
//
// Espelha a semântica do adapter Drizzle: refs vazio → ok([]) sem processamento;
// ref inexistente → ausente no resultado (degradação graciosa).

import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { LoadedDocument } from '#src/modules/financial/domain/document/repository.ts';
import type {
  DocumentSummaryRow,
  DocumentSummaryByIdsView,
  DocumentSummaryByIdsViewError,
} from '#src/modules/financial/application/ports/document-summary-by-ids-view.ts';

// LoadedDocument → DocumentSummaryRow. Espelha o mapper `toListItem` do document-repository.in-memory
// (mesma extração de status/type/supplier/netValue/dueDate do agregado). netValue é null em Draft
// (paridade com toListItem); supplierName/supplierDocument = null (read-model vazio sem worker).
export const loadedDocumentToSummaryRow = (ld: LoadedDocument): DocumentSummaryRow => {
  const doc = ld.document;
  const netValue = doc.status === 'Draft' ? null : doc.netValue;
  return {
    documentId: doc.id,
    documentNumber: doc.documentNumber ?? null,
    type: doc.type ?? null,
    status: doc.status,
    supplierRef: doc.supplier === null ? null : String(doc.supplier),
    netValueCents: netValue === null ? null : netValue.cents,
    dueDate: doc.dueDate ?? null,
    supplierName: null,
    supplierDocument: null,
  };
};

export const createInMemoryDocumentSummaryByIdsView = (
  getRows: () => readonly DocumentSummaryRow[],
): DocumentSummaryByIdsView => ({
  getDocumentsSummaryByIds: async (
    refs: readonly string[],
  ): Promise<Result<readonly DocumentSummaryRow[], DocumentSummaryByIdsViewError>> => {
    if (refs.length === 0) return ok([]);

    const rows = getRows();
    const refSet = new Set(refs);
    const filtered = rows.filter((row) => refSet.has(row.documentId));
    return ok(filtered);
  },
});
