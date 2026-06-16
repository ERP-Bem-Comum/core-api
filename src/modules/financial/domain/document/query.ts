import type { Money } from '../../../../shared/kernel/money.ts';
import type { DocumentStatus, DocumentType } from './types.ts';

// Tipos de leitura (read path) da listagem paginada — US1. `type` é match livre (string) pois
// a query da borda aceita qualquer texto; os demais filtros são tipados.

export type DocumentListFilter = Readonly<{
  status?: DocumentStatus;
  supplierRef?: string;
  type?: string;
  dueFrom?: Date;
  dueTo?: Date; // janela inclusiva
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
  netValue: Money | null; // null em Draft (sem líquido calculado)
  dueDate: Date | null;
  version: number;
}>;

export type Page<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
}>;
