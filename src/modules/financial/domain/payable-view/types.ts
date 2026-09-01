// #235: read-model de payables para Dashboard/Reports (Camada 0). Projeção evento-carregada
// (ADR-0022) — não é agregado; é uma linha materializada por título, atualizada por eventos.

import type { DocumentStatus } from '../document/types.ts';

// `Transmitted` entrou no ADR-0065 §5 (#792, CA4): o read-model DEIXOU de colapsá-lo em `Approved`.
// O colapso era o defeito visível da issue — o operador gerava a remessa, o pagamento saía para o
// banco, e o grid continuava dizendo "Aprovado". Um balde próprio é o que faz a tela distinguir
// "posso pagar" de "já mandei pagar".
export type PayableViewStatus = 'Open' | 'Approved' | 'Transmitted' | 'Paid' | 'Cancelled';

const DOCUMENT_STATUSES: readonly DocumentStatus[] = [
  'Draft',
  'Open',
  'Approved',
  'Transmitted',
  'Refused',
  'Paid',
  'PartiallyReconciled',
  'Reconciled',
];

export const isDocumentStatus = (v: string): v is DocumentStatus =>
  (DOCUMENT_STATUSES as readonly string[]).includes(v);

// #307 (m2): mapa EXPLÍCITO e exaustivo DocumentStatus → PayableViewStatus (o read-model tem 5
// status; o documento tem 8). Switch sem default → o compilador exige cobrir todo status novo
// (fecha o buraco de "reject silencioso" apontado no W2 do #235). Semântica: settled→Paid,
// recusado→Cancelled, rascunho→Open.
//
// ⚠️ `Transmitted` NÃO colapsa mais em `Approved` (ADR-0065 §5). O colapso era deliberado quando o
// título não tinha transição — `Transmitted` era valor morto do enum, e mapeá-lo era só defesa. Ele
// virou defeito no instante em que a transição passou a existir (#792): o grid dizia "Aprovado"
// sobre um pagamento já entregue à VAN, e o operador não tinha como saber que o arquivo saiu.
//
// `PartiallyReconciled`/`Reconciled` seguem colapsando em `Paid`, e isso NÃO é a mesma coisa: eles
// são refinamentos de "já foi pago", e o read-model não promete distingui-los. `Transmitted` é outro
// momento do ciclo, não um refinamento de `Approved`.
export const documentStatusToViewStatus = (s: DocumentStatus): PayableViewStatus => {
  switch (s) {
    case 'Draft':
    case 'Open':
      return 'Open';
    case 'Approved':
      return 'Approved';
    case 'Transmitted':
      return 'Transmitted';
    case 'Refused':
      return 'Cancelled';
    case 'Paid':
    case 'PartiallyReconciled':
    case 'Reconciled':
      return 'Paid';
  }
};

export type PayableView = Readonly<{
  payableId: string;
  documentId: string;
  kind: 'Parent' | 'Child';
  retentionType: string | null;
  supplierRef: string | null;
  contractRef: string | null;
  categoryRef: string | null;
  // #446 (REP-3 / Slice B): Plano Orçamentário — permite ao REP-3 agrupar por Plano Orçamentário.
  budgetPlanRef: string | null;
  // M2/RN-M2-12: folha da árvore do plano (#502). A coluna e o índice existiam desde o #502; o que
  // faltava era o dado chegar até aqui.
  subcategoryRef: string | null;
  costCenterRef: string | null;
  programRef: string | null;
  valueCents: number; // centavos (convenção Money do codebase — bigint(mode:'number'))
  dueDate: string; // ISO YYYY-MM-DD
  status: PayableViewStatus;
  // #239: conta-débito (de qual conta cedente o pagamento sai) + data do pagamento (YYYY-MM-DD).
  // `paidAt` só preenchido quando status='Paid' (via PayableManuallyPaid).
  debitAccountRef: string | null;
  paidAt: string | null;
}>;
