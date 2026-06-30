/**
 * Port: DocumentoRepositoryPort
 * Responsabilidade: CRUD de documentos fiscais/não-fiscais.
 */

// Placeholder — tipo real virá do domain quando o módulo for criado
export type Documento = Readonly<Record<string, unknown>>;

export type DocumentoRepositoryPort = Readonly<{
  save: (doc: Documento) => Promise<DocumentoId>;
  findById: (id: DocumentoId) => Promise<Documento | null>;
  findByFilters: (filters: DocumentoFilters) => Promise<PaginatedResult<Documento>>;
  delete: (id: DocumentoId) => Promise<void>;
}>;

// Tipos de entrada/saída (serão refinados no domínio)
export type DocumentoId = string;

export type DocumentoFilters = Readonly<{
  fornecedorId?: string;
  numero?: string;
  status?: string;
  competencia?: string;
  dataVencimentoDe?: Date;
  dataVencimentoAte?: Date;
  page?: number;
  pageSize?: number;
}>;

export type PaginatedResult<T> = Readonly<{
  data: readonly T[];
  total: number;
  page: number;
  pageSize: number;
}>;
