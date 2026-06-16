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
export type DocumentListItem = Readonly<{
  id: string;
  status: DocumentStatus;
  documentNumber: string | null;
  type: DocumentType | null;
  supplierRef: string | null;
  netValue: Money | null; // null em Draft (sem líquido calculado)
  dueDate: Date | null;
}>;

export type Page<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
}>;
