// Adapter Drizzle de UserQuery (modulo auth, spec 005 US1) — projecao paginada de usuarios.
//
// Contrato: UserQuery.list (user-query.ts) — read model de strings puras (nao branded).
// Zero escrita. Zero throw cruzando a borda. Boundary: try/catch -> Result.
//
// Decisoes (drizzle-orm-expert; handbook/reference/drizzle):
//   1. Busca por name: LIKE %term% — coluna name (varchar 128) herda COLLATE utf8mb4_unicode_ci
//      da tabela -> LIKE e case-insensitive no MySQL 8.4 (ilike nao existe em MySQL). Curingas
//      %/_/\ do termo escapados (mesmo padrao de contract-repository.drizzle.ts).
//   2. Filtro status: eq() quando 'active'|'disabled'; sem clausula quando 'all'.
//   3. ORDER BY name ASC; indice auth_user_name_idx evita filesort.
//   4. Paginacao: COUNT(*) + SELECT projetado LIMIT/OFFSET (select.mdx §"count rows" / §"partial select").
//   5. Projecao explicita (4 colunas) — nao traz password_hash/cpf/etc. pela rede.
//
// ADR-0014: so le auth_*. ADR-0020: SELECT/LIKE/COUNT permitidos; zero json/enum/proc.

import { and, asc, eq, like, sql, type SQL } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  UserQuery,
  ListUsersQuery,
  PagedUsers,
  UserListItem,
  UserQueryError,
} from '#src/modules/auth/application/ports/user-query.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';

type UserRow = Readonly<{
  id: string;
  name: string | null;
  email: string;
  status: string;
}>;

type MapResult = { ok: true; item: UserListItem } | { ok: false; reason: string };

const mapRowToItem = (row: UserRow): MapResult => {
  const status = row.status;
  if (status !== 'active' && status !== 'disabled') {
    return { ok: false, reason: `status invalido: '${status}' (id=${row.id})` };
  }
  return { ok: true, item: { id: row.id, name: row.name, email: row.email, status } };
};

const buildWhere = (
  query: ListUsersQuery,
  authUser: AuthMysqlHandle['schema']['authUser'], // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): SQL | undefined => {
  const clauses: SQL[] = [];

  if (query.status !== 'all') {
    clauses.push(eq(authUser.status, query.status));
  }

  if (query.search !== undefined && query.search.length > 0) {
    const escaped = query.search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    clauses.push(like(authUser.name, `%${escaped}%`));
  }

  if (clauses.length === 0) return undefined;
  return clauses.length === 1 ? clauses[0] : and(...clauses);
};

export const createDrizzleUserQuery = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): UserQuery => {
  const { db, schema } = handle;

  const list = async (query: ListUsersQuery): Promise<Result<PagedUsers, UserQueryError>> => {
    try {
      const { page, pageSize } = query;
      const where = buildWhere(query, schema.authUser);

      const countRows = await db
        .select({ total: sql<number>`count(*)` })
        .from(schema.authUser)
        .where(where);
      const totalItems = countRows[0]?.total ?? 0;

      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const offset = (page - 1) * pageSize;

      const rows = await db
        .select({
          id: schema.authUser.id,
          name: schema.authUser.name,
          email: schema.authUser.email,
          status: schema.authUser.status,
        })
        .from(schema.authUser)
        .where(where)
        .orderBy(asc(schema.authUser.name))
        .limit(pageSize)
        .offset(offset);

      const items: UserListItem[] = [];
      for (const row of rows) {
        const mapped = mapRowToItem(row);
        if (!mapped.ok) {
          process.stderr.write(`[user-query:list:mapper] ${mapped.reason}\n`);
          return err('user-query-unavailable');
        }
        items.push(mapped.item);
      }

      return ok({ items, meta: { currentPage: page, pageSize, totalItems, totalPages } });
    } catch (cause) {
      process.stderr.write(`[user-query:list] ${String(cause)}\n`);
      return err('user-query-unavailable');
    }
  };

  return { list };
};
