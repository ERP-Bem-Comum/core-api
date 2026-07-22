// Port DocumentSummaryByIdsView (#358) — leitura read-only de resumo de documento dado um conjunto de
// documentIds (SELECT fin_documents ⟕ recon (derivação de conciliação) ⟕ fin_supplier_view). Alimenta
// `POST /api/v2/financial/documents:batch` (BFF/ADR-0049), fornecendo as refs auxiliares do drawer de
// Detalhe (#95) em 1 hop — supplierName/supplierDocument já vêm do read-model local.
//
// ISP (Interface Segregation): port focado no subset que o batch precisa (9 campos do contrato).
// NÃO reaproveita DocumentRepository.findPaged (paginado, com filtros + Money VO). Espelha o precedente
// direto payable-summary-by-ids-view.ts (#357), trocando payable→documento.
//
// `status` é o displayStatus DERIVADO no adapter Drizzle (reflete 'Reconciled' sem escrever em
// fin_documents — ADR-0022), idêntico ao grid (findPaged) para não divergir entre listagem e batch.
// No adapter in-memory é o status cru do documento (paridade com o grid in-memory `toListItem`, que
// também não deriva Reconciled — a derivação real é coberta em integração).
//
// Padrão: Readonly<{ fn }> (application.md §"Ports são `type`").

import type { Result } from '../../../../shared/primitives/result.ts';

// Shape plano projetado por fin_documents ⟕ fin_supplier_view (+ displayStatus derivado no Drizzle).
// `netValueCents`: finDocuments.netValue (Money em cents; number | null — null em Draft).
// `dueDate`: finDocuments.dueDate — nullable (Draft pode não ter vencimento).
// `type`: finDocuments.type — nullable. `status`: displayStatus (Drizzle) ou cru (memory).
// `supplierName`/`supplierDocument`: fin_supplier_view via LEFT JOIN — null se o read-model local
// ainda não resolveu o fornecedor (consistência eventual via outbox — ADR-0043).
export type DocumentSummaryRow = Readonly<{
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

export type DocumentSummaryByIdsViewError = 'document-summary-by-ids-view-failure';

export type DocumentSummaryByIdsView = Readonly<{
  // refs vazio → ok([]) sem ir ao banco.
  // ref inexistente → linha OMITIDA (degradação graciosa; a borda deriva `missing` por diferença de conjunto).
  // Ordem do resultado NÃO garante correspondência com a ordem de `refs`; o BFF casa por `ref`/`documentId`.
  getDocumentsSummaryByIds: (
    refs: readonly string[],
  ) => Promise<Result<readonly DocumentSummaryRow[], DocumentSummaryByIdsViewError>>;
}>;
