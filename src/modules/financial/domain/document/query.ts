import type { Money } from '../../../../shared/kernel/money.ts';
import type { DocumentStatus, DocumentType, PaymentMethod } from './types.ts';

// Tipos de leitura (read path) da listagem paginada — US1. `type` é match livre (string) pois
// a query da borda aceita qualquer texto; os demais filtros são tipados.

export type DocumentListFilter = Readonly<{
  status?: DocumentStatus;
  supplierRef?: string;
  type?: string;
  dueFrom?: Date;
  dueTo?: Date; // janela inclusiva
  issuedFrom?: Date; // #163: filtro por emissão (janela inclusiva)
  issuedTo?: Date;
  // #167: busca textual — contains (case-insensitive) em documentNumber + nome/CNPJ do fornecedor
  // (fin_supplier_view via LEFT JOIN). No driver memory o fornecedor pode vir null (read-model vazio).
  q?: string;
}>;

// Read-model leve da listagem (FR-004 — payload enxuto, sem títulos/retenções). Evita
// reconstruir o agregado completo (overfetch das tabelas filhas) por linha da página.
//
// `version` (FR-009): exposto para que o front possa realizar ações inline (PATCH/approve)
// sem precisar de um findById extra. Espelha `fin_documents.version` via coluna lida no
// SELECT de listagem. Vernon, _Implementing DDD_ (ddd--vernon-livro-vermelho.md:8869).
export type DocumentListItem = Readonly<{
  id: string;
  status: DocumentStatus;
  documentNumber: string | null;
  type: DocumentType | null;
  supplierRef: string | null;
  // Campos locais do documento expostos no grid de Contas a Pagar (#47/US1).
  series: string | null;
  grossValue: Money | null; // null em Draft (sem bruto informado)
  paymentMethod: PaymentMethod | null;
  contractRef: string | null;
  netValue: Money | null; // null em Draft (sem líquido calculado)
  dueDate: Date | null;
  issueDate: Date | null; // #163: data de emissão exposta no grid
  version: number;
  // Fornecedor resolvido pelo read-model local `fin_supplier_view` (#47/US2) — null quando
  // `supplierRef` é nulo ou ainda não está no read-model (consistência eventual).
  supplierName: string | null;
  supplierDocument: string | null;
}>;

export type Page<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
}>;
