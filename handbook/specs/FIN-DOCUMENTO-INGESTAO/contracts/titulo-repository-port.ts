/**
 * Port: TituloRepositoryPort
 * Responsabilidade: CRUD de títulos pai e filhos.
 */

// Placeholder — tipo real virá do domain quando o módulo for criado
export type Titulo = Readonly<Record<string, unknown>>;

export type TituloRepositoryPort = Readonly<{
  save: (titulo: Titulo) => Promise<TituloId>;
  saveMany: (titulos: readonly Titulo[]) => Promise<readonly TituloId[]>;
  findById: (id: TituloId) => Promise<Titulo | null>;
  findByDocumentoId: (documentoId: DocumentoId) => Promise<readonly Titulo[]>;
  findByFilters: (filters: TituloFilters) => Promise<PaginatedResult<Titulo>>;
  deleteByDocumentoId: (documentoId: DocumentoId) => Promise<void>;
}>;

export type TituloId = string;
export type DocumentoId = string;

export type TituloFilters = Readonly<{
  documentoId?: DocumentoId;
  status?: string;
  fornecedorId?: string;
  vencimentoDe?: Date;
  vencimentoAte?: Date;
  page?: number;
  pageSize?: number;
}>;

export type PaginatedResult<T> = Readonly<{
  data: readonly T[];
  total: number;
  page: number;
  pageSize: number;
}>;
