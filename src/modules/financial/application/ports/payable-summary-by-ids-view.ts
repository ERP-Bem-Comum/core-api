// Port PayableSummaryByIdsView (#357) — leitura read-only de resumo de título dado um conjunto de
// payableIds (JOIN fin_payables × fin_documents × LEFT JOIN fin_supplier_view). Alimenta
// `POST /api/v2/financial/payables:batch` (BFF/ADR-0049), destravando o match card da
// Conciliação (#172) em 1 hop — supplierName/supplierDocument já vêm do read-model local.
//
// ISP (Interface Segregation): port focado no que o batch precisa (11 campos do contrato).
// NÃO reaproveita PayableListView (paginado) nem PayableDocumentView (sem título/fornecedor).
//
// Padrão: Readonly<{ fn }> (application.md §"Ports são `type`").
// Precedente: payable-document-view.ts §"findByPayableIds(ids: readonly string[])" — mesma
// semântica de degradação (id inexistente → linha ausente; ids vazio → ok([]) sem ir ao banco).

import type { Result } from '../../../../shared/primitives/result.ts';

// Shape plano projetado pelo JOIN fin_payables ⋈ fin_documents ⟕ fin_supplier_view.
// `valueCents`: finPayables.value (Money em cents; number — mesmo mapeamento de PayableListItem.valueCents).
// `dueDate`: finPayables.dueDate — date('due_date', { mode: 'date' }).notNull() → sempre Date.
// `status`: finPayables.status — status do TÍTULO (não do documento).
// `documentType`/`paymentMethod`/`supplierRef`: finDocuments.* — nullable (Draft pode não tê-los).
// `supplierName`/`supplierDocument`: fin_supplier_view via LEFT JOIN — null se o read-model local
// ainda não resolveu o fornecedor (consistência eventual via outbox — ADR-0043).
export type PayableSummaryRow = Readonly<{
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

export type PayableSummaryByIdsViewError = 'payable-summary-by-ids-view-failure';

export type PayableSummaryByIdsView = Readonly<{
  // refs vazio → ok([]) sem ir ao banco.
  // ref inexistente → linha OMITIDA (degradação graciosa; a borda deriva `missing` por diferença de conjunto).
  // Ordem do resultado NÃO garante correspondência com a ordem de `refs`; o BFF casa por `ref`/`payableId`.
  getPayablesSummaryByIds: (
    refs: readonly string[],
  ) => Promise<Result<readonly PayableSummaryRow[], PayableSummaryByIdsViewError>>;
}>;
