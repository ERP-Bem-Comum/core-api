/**
 * listUsers - use case do modulo auth (spec 005, US1): lista usuarios com paginacao/busca/filtro.
 *
 * Imperative shell fino: valida/normaliza a entrada e delega ao port de leitura UserQuery.
 * pageSize ∈ {5,10,25} (espelha o legado, FR-001); page >= 1. search trimado; vazio = sem busca.
 * Result na borda, sem throw. ASCII puro.
 */

import { type Result, err } from '#src/shared/primitives/result.ts';
import type {
  UserQuery,
  ListUsersQuery,
  PagedUsers,
  UserStatusFilter,
  UserQueryError,
} from '#src/modules/auth/application/ports/user-query.ts';

export type ListUsersInput = Readonly<{
  page?: number;
  pageSize?: number;
  search?: string;
  status?: UserStatusFilter;
}>;

export type ListUsersError = 'invalid-page' | 'invalid-page-size' | UserQueryError;

type Deps = Readonly<{ userQuery: UserQuery }>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 5;

export const listUsers =
  (deps: Deps) =>
  async (input: ListUsersInput): Promise<Result<PagedUsers, ListUsersError>> => {
    const page = input.page ?? DEFAULT_PAGE;
    const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
    const status = input.status ?? 'all';

    if (!Number.isInteger(page) || page < 1) return err('invalid-page');
    if (pageSize !== 5 && pageSize !== 10 && pageSize !== 25) return err('invalid-page-size');

    const trimmed = input.search?.trim();
    const query: ListUsersQuery =
      trimmed !== undefined && trimmed.length > 0
        ? { page, pageSize, status, search: trimmed }
        : { page, pageSize, status };

    return deps.userQuery.list(query);
  };
