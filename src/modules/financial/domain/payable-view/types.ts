// #235: read-model de payables para Dashboard/Reports (Camada 0). Projeção evento-carregada
// (ADR-0022) — não é agregado; é uma linha materializada por título, atualizada por eventos.

import type { DocumentStatus } from '../document/types.ts';

export type PayableViewStatus = 'Open' | 'Approved' | 'Paid' | 'Cancelled';

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

// #307 (m2): mapa EXPLÍCITO e exaustivo DocumentStatus → PayableViewStatus (o read-model tem 4
// status; o documento tem 8). Switch sem default → o compilador exige cobrir todo status novo
// (fecha o buraco de "reject silencioso" apontado no W2 do #235). Semântica: settled→Paid,
// em-trânsito→Approved, recusado→Cancelled, rascunho→Open.
export const documentStatusToViewStatus = (s: DocumentStatus): PayableViewStatus => {
  switch (s) {
    case 'Draft':
    case 'Open':
      return 'Open';
    case 'Approved':
    case 'Transmitted':
      return 'Approved';
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
  costCenterRef: string | null;
  programRef: string | null;
  valueCents: number; // centavos (convenção Money do codebase — bigint(mode:'number'))
  dueDate: string; // ISO YYYY-MM-DD
  status: PayableViewStatus;
}>;
