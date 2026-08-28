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
  // M2/RN-M2-11: `Parent` (líquido) ou `Child` (retenção). É o que decide se este título pode ser
  // FONTE de uma reclassificação — o imposto é alvo da cascata, nunca fonte.
  kind: string;
  supplierRef: string | null;
  documentNumber: string | null;
  dueDate: Date | null;
  categoryRef: string | null;
  costCenterRef: string | null;
  // M2 + #268: os 5 níveis completos. Servem a dois consumidores de uma vez — a M2 lê a taxonomia
  // VIGENTE para compor o de→para da trilha, e a leitura do conciliado (#268) devolve a
  // categorização que hoje volta como "—" porque nunca foi projetada de volta.
  budgetPlanRef: string | null;
  subcategoryRef: string | null;
  programRef: string | null;
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
