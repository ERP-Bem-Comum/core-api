/**
 * UserQuery - port de leitura (read model) para listagem administrativa de usuarios (spec 005, US1).
 *
 * Projecao paginada SEPARADA do UserRepository (CQRS-lite): o read model devolve strings simples
 * (nao branded), pois alimenta a borda HTTP/JSON, nao o dominio. Implementacoes: in-memory (testes/E2E)
 * e Drizzle (ticket AUTH-HTTP-LIST-USERS). ASCII puro.
 */

import type { Result } from '#src/shared/primitives/result.ts';

export type UserStatusFilter = 'active' | 'disabled' | 'all';

export type UserListItem = Readonly<{
  id: string;
  name: string | null;
  email: string;
  status: 'active' | 'disabled';
}>;

export type PageMeta = Readonly<{
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}>;

export type PagedUsers = Readonly<{
  items: readonly UserListItem[];
  meta: PageMeta;
}>;

export type ListUsersQuery = Readonly<{
  page: number;
  pageSize: number;
  search?: string;
  status: UserStatusFilter;
}>;

export type UserQueryError = 'user-query-unavailable';

export type UserQuery = Readonly<{
  list: (query: ListUsersQuery) => Promise<Result<PagedUsers, UserQueryError>>;
  // #148: lista (não paginada) os usuários ATIVOS que possuem a permissão informada — alimenta o
  // dropdown de aprovadores (`payable:approve`) da inclusão do documento. Ordenado por nome.
  listByPermission: (
    permission: string,
  ) => Promise<Result<readonly UserListItem[], UserQueryError>>;
}>;
