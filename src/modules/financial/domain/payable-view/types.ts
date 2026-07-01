// #235: read-model de payables para Dashboard/Reports (Camada 0). Projeção evento-carregada
// (ADR-0022) — não é agregado; é uma linha materializada por título, atualizada por eventos.

export type PayableViewStatus = 'Open' | 'Approved' | 'Paid' | 'Cancelled';

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
