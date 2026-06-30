// Adapter Drizzle de UserRepository + UserReader (modulo auth).
//
// Blueprint DBA (001-query-blueprint.md) seguido a risca:
//   1. Timestamps: `now = clock.now()` injetado no topo do save (testavel).
//   2. Upsert auth_user: SELECT FOR UPDATE -> UPDATE ou INSERT (ADR-0020 — sem ODKU).
//   3. Replace auth_user_role: DELETE WHERE user_id + INSERT batch (skip se vazio).
//   4. isEmailDupEntry: errno===1062 E sqlMessage.includes('auth_user_email_idx').
//   5. Reidratacao: 3 queries separadas (Q1/Q2/Q3). inArray na Q3. Skip Q3 se sem roles.
//   6. buildUser: mapper userFromRows -> Result; falha -> user-repo-unavailable.
//
// ADR-0020: sem ON DUPLICATE KEY. ADR-0014: so auth_*. Zero throw/class no dominio.
// Boundary: try/catch converte para Result antes de cruzar borda para application.

import { eq, inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  UserRepository,
  UserReader,
  UserRepositoryError,
} from '../../../domain/identity/user/repository.ts';
import type { User } from '../../../domain/identity/user/types.ts';
import type { UserId } from '../../../domain/identity/user-id.ts';
import type { Email } from '../../../domain/identity/email.ts';
import type { Clock } from '../../../../../shared/ports/clock.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  userFromRows,
  userToInsert,
  type RoleJoinRow,
  type PermJoinRow,
} from '../mappers/user.mapper.ts';

// ─── ER_DUP_ENTRY detection ────────────────────────────────────────────────────
//
// Blueprint §4: isEmailDupEntry = errno===1062 E sqlMessage.includes('auth_user_email_idx').
// Distingue o dup do email (unico que retorna email-already-registered) do dup de PK
// (corrida de inserts com mesmo id -> user-repo-unavailable).
// Verifica tanto o erro direto quanto o cause (Drizzle pode encadear o mysql2 err).

const getDupEntryInfo = (e: unknown): { errno: number; sqlMessage: string } | null => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (typeof obj['errno'] === 'number' && obj['errno'] === 1062) {
        return {
          errno: 1062,
          sqlMessage: typeof obj['sqlMessage'] === 'string' ? obj['sqlMessage'] : '',
        };
      }
    }
  }
  return null;
};

const isEmailDupEntry = (e: unknown): boolean => {
  const info = getDupEntryInfo(e);
  if (info === null) return false;
  return info.sqlMessage.includes('auth_user_email_idx');
};

// ─── safe wrapper ──────────────────────────────────────────────────────────────
//
// Converte excecoes de I/O para user-repo-unavailable. Nao usado no save (o save
// tem tratamento especializado para distinguir isEmailDupEntry).

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, UserRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[user-repo:${ctx}] ${String(cause)}\n`);
    return err('user-repo-unavailable');
  }
};

// ─── buildUser ──────────────────────────────────────────────────────────────────
//
// Constroi User a partir das 3 queries. Falha do mapper -> user-repo-unavailable
// (padrão buildContract no contract-repository.drizzle.ts:33-44).

const buildUser = (
  userRow: Parameters<typeof userFromRows>[0],
  roleRows: Parameters<typeof userFromRows>[1],
  permRows: Parameters<typeof userFromRows>[2],
): Result<User, UserRepositoryError> => {
  const r = userFromRows(userRow, roleRows, permRows);
  if (!r.ok) {
    process.stderr.write(`[user-repo:mapper] ${r.error.tag}\n`);
    return err('user-repo-unavailable');
  }
  return ok(r.value);
};

// ─── Factory ──────────────────────────────────────────────────────────────────
//
// createDrizzleUserStore(handle, clock) -> { repository, reader }
// `clock` injetado para timestamps (blueprint §1 — testavel, sem `new Date()`).

export const createDrizzleUserStore = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): Readonly<{ repository: UserRepository; reader: UserReader }> => {
  const { db, schema } = handle;

  // ── findById (3 queries) ────────────────────────────────────────────────────

  const findById = async (id: UserId): Promise<Result<User | null, UserRepositoryError>> =>
    safe('findById', async () => {
      // Q1: auth_user por PK (type=const — blueprint §5)
      const userRows = await db
        .select()
        .from(schema.authUser)
        .where(eq(schema.authUser.id, id as unknown as string));
      const userRow = userRows[0];
      if (userRow === undefined) return null;

      // Q2: auth_user_role JOIN auth_role WHERE user_id=? (ref prefixo PK)
      const roleRows = (await db
        .select({
          // Campos de UserRoleRow
          userId: schema.authUserRole.userId,
          roleId: schema.authUserRole.roleId,
          assignedAt: schema.authUserRole.assignedAt,
          // Campos de RoleRow — aliasados para o shape esperado pelo mapper
          id: schema.authRole.id,
          name: schema.authRole.name,
          description: schema.authRole.description,
          createdAt: schema.authRole.createdAt,
          updatedAt: schema.authRole.updatedAt,
        })
        .from(schema.authUserRole)
        .innerJoin(schema.authRole, eq(schema.authUserRole.roleId, schema.authRole.id))
        .where(eq(schema.authUserRole.userId, id as unknown as string))) as RoleJoinRow[];

      if (roleRows.length === 0) {
        // Sem roles: skip Q3 (inArray de lista vazia causa erro em mysql2)
        const r = buildUser(userRow, [], []);
        if (!r.ok) throw new Error(JSON.stringify(r.error));
        return r.value;
      }

      // Q3: auth_role_permission JOIN auth_permission WHERE role_id IN (...) (range prefixo PK)
      const roleIds = roleRows.map((r) => r.roleId);
      const permRows = (await db
        .select({
          roleId: schema.authRolePermission.roleId,
          id: schema.authPermission.id,
          name: schema.authPermission.name,
          createdAt: schema.authPermission.createdAt,
        })
        .from(schema.authRolePermission)
        .innerJoin(
          schema.authPermission,
          eq(schema.authRolePermission.permissionId, schema.authPermission.id),
        )
        .where(inArray(schema.authRolePermission.roleId, roleIds))) as PermJoinRow[];

      const r = buildUser(userRow, roleRows, permRows);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  // ── findByEmail (3 queries) ─────────────────────────────────────────────────

  const findByEmail = async (email: Email): Promise<Result<User | null, UserRepositoryError>> =>
    safe('findByEmail', async () => {
      // Q1: auth_user por auth_user_email_idx (type=const — blueprint §5)
      const userRows = await db
        .select()
        .from(schema.authUser)
        .where(eq(schema.authUser.email, email as unknown as string));
      const userRow = userRows[0];
      if (userRow === undefined) return null;

      // Q2 e Q3: mesmo padrao de findById (reusar logica via id do userRow)
      const roleRows = (await db
        .select({
          userId: schema.authUserRole.userId,
          roleId: schema.authUserRole.roleId,
          assignedAt: schema.authUserRole.assignedAt,
          id: schema.authRole.id,
          name: schema.authRole.name,
          description: schema.authRole.description,
          createdAt: schema.authRole.createdAt,
          updatedAt: schema.authRole.updatedAt,
        })
        .from(schema.authUserRole)
        .innerJoin(schema.authRole, eq(schema.authUserRole.roleId, schema.authRole.id))
        .where(eq(schema.authUserRole.userId, userRow.id))) as RoleJoinRow[];

      if (roleRows.length === 0) {
        const r = buildUser(userRow, [], []);
        if (!r.ok) throw new Error(JSON.stringify(r.error));
        return r.value;
      }

      const roleIds = roleRows.map((r) => r.roleId);
      const permRows = (await db
        .select({
          roleId: schema.authRolePermission.roleId,
          id: schema.authPermission.id,
          name: schema.authPermission.name,
          createdAt: schema.authPermission.createdAt,
        })
        .from(schema.authRolePermission)
        .innerJoin(
          schema.authPermission,
          eq(schema.authRolePermission.permissionId, schema.authPermission.id),
        )
        .where(inArray(schema.authRolePermission.roleId, roleIds))) as PermJoinRow[];

      const r = buildUser(userRow, roleRows, permRows);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  // ── save (transacao: SELECT FOR UPDATE -> UPDATE/INSERT auth_user + replace auth_user_role) ──
  //
  // Blueprint §2: Upsert via SELECT-then-UPDATE-or-INSERT (ADR-0020 — sem ODKU).
  // Blueprint §3: Replace auth_user_role via DELETE+INSERT batch (skip se roles vazio).
  // Blueprint §4: isEmailDupEntry -> email-already-registered; outros erros -> user-repo-unavailable.
  //
  // O save NAO usa o safe() generico porque precisa distinguir isEmailDupEntry.

  const save = async (user: User): Promise<Result<void, UserRepositoryError>> => {
    const now = clock.now();
    const row = userToInsert(user, now);

    try {
      await db.transaction(async (tx) => {
        // SELECT FOR UPDATE: adquire next-key lock se row existe ou gap lock se ausente.
        // Elimina janela de corrida em que duas tx leem "nao existe" e ambas tentam INSERT
        // (blueprint §2, espelha contract-repository.drizzle.ts:79-83).
        const existing = await tx
          .select({ id: schema.authUser.id })
          .from(schema.authUser)
          .where(eq(schema.authUser.id, row.id))
          .for('update');

        if (existing.length > 0) {
          // UPDATE by PK. Se o email mudou para um ja existente em outra row,
          // o UNIQUE em auth_user_email_idx lanca ER_DUP_ENTRY (capturado abaixo).
          await tx.update(schema.authUser).set(row).where(eq(schema.authUser.id, row.id));
        } else {
          // INSERT puro. FK de auth_user_role sera inserida logo abaixo.
          // Email duplicado: ER_DUP_ENTRY em auth_user_email_idx -> capturado abaixo.
          await tx.insert(schema.authUser).values(row);
        }

        // Replace auth_user_role: DELETE + INSERT batch (blueprint §3).
        // Idempotente para upsert: reflete exatamente roles[] do agregado.
        await tx.delete(schema.authUserRole).where(eq(schema.authUserRole.userId, row.id));

        // Skip se roles vazio (mysql2 lanca em values([]) — blueprint §3 / contracts:100).
        if (user.roles.length > 0) {
          await tx.insert(schema.authUserRole).values(
            user.roles.map((role) => ({
              userId: row.id,
              roleId: role.id as unknown as string,
              assignedAt: now,
            })),
          );
        }
      });

      return ok(undefined);
    } catch (cause) {
      // Blueprint §4: isEmailDupEntry = errno 1062 E sqlMessage inclui 'auth_user_email_idx'.
      if (isEmailDupEntry(cause)) {
        return err('email-already-registered');
      }
      process.stderr.write(`[user-repo:save] ${String(cause)}\n`);
      return err('user-repo-unavailable');
    }
  };

  const repository: UserRepository = { save };
  const reader: UserReader = { findById, findByEmail };

  return { repository, reader };
};
