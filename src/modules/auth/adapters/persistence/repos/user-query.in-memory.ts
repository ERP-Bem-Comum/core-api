/**
 * Adapter in-memory de UserQuery (modulo auth, spec 005 US1). Projecao sobre uma fonte de Users
 * do dominio. Usado em testes e no E2E offline. Boundary: converte para o read model (strings).
 *
 * Filtro: busca parcial case-insensitive por nome; status (active/disabled/all). Ordenacao
 * alfabetica por nome. Paginacao por offset. ASCII puro.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import type {
  UserQuery,
  ListUsersQuery,
  PagedUsers,
  UserListItem,
  UserQueryError,
} from '#src/modules/auth/application/ports/user-query.ts';

const toItem = (user: User): UserListItem => ({
  id: String(user.id),
  name: user.name,
  email: String(user.email),
  status: user.status,
});

const matchesSearch = (user: User, search: string): boolean =>
  (user.name ?? '').toLowerCase().includes(search.toLowerCase());

export const inMemoryUserQuery = (source: () => readonly User[]): UserQuery => ({
  list: async (query: ListUsersQuery): Promise<Result<PagedUsers, UserQueryError>> => {
    const { page, pageSize, search, status } = query;

    const filtered = source()
      .filter((u) => (search === undefined ? true : matchesSearch(u, search)))
      .filter((u) => (status === 'all' ? true : u.status === status));

    const sorted = [...filtered].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize).map(toItem);

    return ok({ items, meta: { currentPage: page, pageSize, totalItems, totalPages } });
  },
});
