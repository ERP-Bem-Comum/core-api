// Port PayableDocumentView (#146) — leitura read-only de campos do documento
// dado um conjunto de payableIds (JOIN fin_payables × fin_documents).
//
// ISP (Interface Segregation): port focado no que o gathering do export CSV-Nibo precisa.
// NÃO infla PayableReconciliationView (fluxo `confirm`) — cada port responde a um use-case.
//
// Padrão: Readonly<{ fn }> (application.md §"Ports são `type`").
// Precedente: payable-reconciliation-view.ts §"findSnapshotsByIds(ids: readonly string[])".

import type { Result } from '../../../../shared/primitives/result.ts';

// Shape plano projetado pelo JOIN fin_payables × fin_documents.
// `dueDate`: date('due_date', { mode: 'date' }) → Date | null (schema mysql.ts:120).
// `competencia`: varchar(7) YYYY-MM CRU — conversão para Date é responsabilidade do use-case.
// Campos de documento são nullable: todos podem ser null se o documento for Draft ou se o
// campo não tiver sido preenchido.
export type PayableDocumentRow = Readonly<{
  payableId: string;
  documentId: string;
  supplierRef: string | null;
  documentNumber: string | null;
  dueDate: Date | null;
  categoryRef: string | null;
  costCenterRef: string | null;
  competencia: string | null;
  payeeKind: string | null;
}>;

export type PayableDocumentViewError = 'payable-document-view-failure';

export type PayableDocumentView = Readonly<{
  // ids vazio → ok([]) sem ir ao banco.
  // id inexistente → linha ausente (degradação graciosa).
  // Ordem do resultado NÃO garante correspondência com a ordem de `ids`; use-case indexa por payableId.
  findByPayableIds: (
    ids: readonly string[],
  ) => Promise<Result<readonly PayableDocumentRow[], PayableDocumentViewError>>;
}>;
