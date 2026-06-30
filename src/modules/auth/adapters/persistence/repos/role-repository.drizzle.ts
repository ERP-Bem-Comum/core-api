// Adapter Drizzle de RoleRepository (modulo auth).
//
// Blueprint DBA (AUTH-DB-REPO-ROLE/001-query-blueprint.md) seguido a risca:
//   1. Timestamps: `now = clock.now()` injetado no topo do save (testavel).
//   2. Upsert auth_role: SELECT FOR UPDATE -> UPDATE ou INSERT (ADR-0020 — sem ODKU).
//   3. Upsert auth_permission por name: SELECT id WHERE name=? -> INSERT se ausente.
//      Corrida (ER_DUP_ENTRY em auth_permission_name_idx) -> ignore-then-reselect.
//      Loop serial (nao Promise.all — evita deadlock no name_idx).
//   4. Replace auth_role_permission: DELETE WHERE role_id + INSERT batch (skip se vazio).
//   5. isPermissionNameDupEntry: errno===1062 E sqlMessage.includes('auth_permission_name_idx').
//   6. findById: 2 queries (Q1 auth_role por PK, Q2 JOIN role_permission->permission).
//   7. list: 2 queries (Q1 todos auth_role, Q2 WHERE role_id IN ()); Map para agrupamento.
//
// ADR-0020: sem ON DUPLICATE KEY. ADR-0014: so auth_*. Zero throw/class no dominio.
// Boundary: try/catch converte para Result antes de cruzar borda para application.

import { eq, inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  RoleRepository,
  RoleRepositoryError,
} from '../../../domain/authorization/role-repository.ts';
import type { Role } from '../../../domain/authorization/role.ts';
import type { RoleId } from '../../../domain/authorization/role-id.ts';
import { newUuid } from '../../../../../shared/utils/id.ts';
import type { Clock } from '../../../../../shared/ports/clock.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';
import { roleFromRows, roleToInsert, type PermJoinRow } from '../mappers/role.mapper.ts';

// ─── ER_DUP_ENTRY detection ────────────────────────────────────────────────────
//
// Blueprint §5: isPermissionNameDupEntry = errno===1062 E sqlMessage.includes('auth_permission_name_idx').
// Distingue dup de name (ignore-then-reselect) do dup de PK ou de auth_role_name_idx.
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

const isPermissionNameDupEntry = (e: unknown): boolean => {
  const info = getDupEntryInfo(e);
  if (info === null) return false;
  return info.sqlMessage.includes('auth_permission_name_idx');
};

// ─── safe wrapper ──────────────────────────────────────────────────────────────
//
// Converte excecoes de I/O para role-repo-unavailable.
// Nao usado no save (precisa de tratamento especializado).

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, RoleRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[role-repo:${ctx}] ${String(cause)}\n`);
    return err('role-repo-unavailable');
  }
};

// ─── buildRole ──────────────────────────────────────────────────────────────────
//
// Constroi Role a partir de roleRow + permRows.
// Falha do mapper -> role-repo-unavailable (espelha buildUser/buildContract).

const buildRole = (
  roleRow: Parameters<typeof roleFromRows>[0],
  permRows: Parameters<typeof roleFromRows>[1],
): Result<Role, RoleRepositoryError> => {
  const r = roleFromRows(roleRow, permRows);
  if (!r.ok) {
    process.stderr.write(`[role-repo:mapper] ${r.error.tag}\n`);
    return err('role-repo-unavailable');
  }
  return ok(r.value);
};

// ─── Factory ──────────────────────────────────────────────────────────────────
//
// createDrizzleRoleStore(handle, clock) -> { repository }
// `clock` injetado para timestamps (blueprint §1 — testavel, sem `new Date()`).
// Sem `reader` separado — port RoleRepository nao separa leitura (DD-PORTS-01).

export const createDrizzleRoleStore = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): Readonly<{ repository: RoleRepository }> => {
  const { db, schema } = handle;

  // ── resolvePermissionId ──────────────────────────────────────────────────────
  //
  // Blueprint §save fase 2: SELECT id WHERE name=? -> INSERT se ausente.
  // Corrida: ER_DUP_ENTRY em auth_permission_name_idx -> re-SELECT (ignore-then-reselect).
  // Idempotente: qualquer id lido e correto (permission e imutavel).
  // Loop serial no caller (nao Promise.all — evita deadlock no name_idx).

  const resolvePermissionId = async (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0], // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
    name: string,
    now: Date,
  ): Promise<string> => {
    // SELECT id por name (type=const — auth_permission_name_idx UNIQUE)
    const existing = await tx
      .select({ id: schema.authPermission.id })
      .from(schema.authPermission)
      .where(eq(schema.authPermission.name, name));

    if (existing[0] !== undefined) {
      return existing[0].id;
    }

    // Ausente: gerar novo id e tentar INSERT
    const newId = newUuid();
    try {
      await tx.insert(schema.authPermission).values({
        id: newId,
        name,
        createdAt: now,
      });
      return newId;
    } catch (insertErr) {
      if (isPermissionNameDupEntry(insertErr)) {
        // Corrida: outra tx inseriu antes. Re-SELECT (permission e imutavel; qualquer id e correto).
        const raced = await tx
          .select({ id: schema.authPermission.id })
          .from(schema.authPermission)
          .where(eq(schema.authPermission.name, name));

        const racedRow = raced[0];
        if (racedRow !== undefined) return racedRow.id;
        // Improvavel (re-SELECT vazio apos dup entry) — relanca para o caller tratar
      }
      throw insertErr;
    }
  };

  // ── findById (2 queries) ────────────────────────────────────────────────────

  const findById = async (id: RoleId): Promise<Result<Role | null, RoleRepositoryError>> =>
    safe('findById', async () => {
      // Q1: auth_role por PK (type=const — blueprint §findById)
      const roleRows = await db
        .select()
        .from(schema.authRole)
        .where(eq(schema.authRole.id, id as unknown as string));

      const roleRow = roleRows[0];
      if (roleRow === undefined) return null;

      // Q2: auth_role_permission JOIN auth_permission WHERE role_id=?
      // (ref prefixo PK + eq_ref PK perm — blueprint §findById)
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
        .where(eq(schema.authRolePermission.roleId, id as unknown as string))) as PermJoinRow[];

      const r = buildRole(roleRow, permRows);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  // ── list (2 queries, N+1-free) ───────────────────────────────────────────────
  //
  // Blueprint §list: Q1 todos auth_role (type=ALL — tabela pequena, aceitavel).
  // Q2: WHERE role_id IN (ids Q1); skip se Q1 vazio (inArray vazio causa erro em mysql2).
  // Agrupar via Map<role_id, PermJoinRow[]> em memoria; buildRole por role.

  const list = async (): Promise<Result<readonly Role[], RoleRepositoryError>> =>
    safe('list', async () => {
      // Q1: todos auth_role
      const roleRows = await db.select().from(schema.authRole);

      if (roleRows.length === 0) return [];

      // Q2: auth_role_permission JOIN auth_permission WHERE role_id IN (...)
      // (range prefixo PK + eq_ref PK perm — blueprint §list)
      const roleIds = roleRows.map((r) => r.id);
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

      // Agrupar permissoes por role_id via Map (sem N+1 — blueprint §list)
      const permsByRole = new Map<string, PermJoinRow[]>();
      for (const permRow of permRows) {
        const existing = permsByRole.get(permRow.roleId) ?? [];
        existing.push(permRow);
        permsByRole.set(permRow.roleId, existing);
      }

      // buildRole por role
      const roles: Role[] = [];
      for (const roleRow of roleRows) {
        const perms = permsByRole.get(roleRow.id) ?? [];
        const r = buildRole(roleRow, perms);
        if (!r.ok) throw new Error(JSON.stringify(r.error));
        roles.push(r.value);
      }

      return roles;
    });

  // ── save (transacao: 3 fases, ordem obrigatoria por FK) ──────────────────────
  //
  // Fase 1: Upsert auth_role (SELECT FOR UPDATE -> UPDATE ou INSERT; description NULL).
  // Fase 2: Upsert auth_permission por name (serial, ignore-then-reselect via resolvePermissionId).
  // Fase 3: Replace auth_role_permission (DELETE WHERE role_id + INSERT batch; skip se vazio).
  //
  // Blueprint §save: nao usa safe() generico — precisa de isPermissionNameDupEntry.
  // ADR-0020: sem ON DUPLICATE KEY UPDATE.

  const save = async (role: Role): Promise<Result<void, RoleRepositoryError>> => {
    const now = clock.now();
    const row = roleToInsert(role, now);

    try {
      await db.transaction(async (tx) => {
        // ── Fase 1: Upsert auth_role ──────────────────────────────────────────
        // SELECT FOR UPDATE: adquire next-key lock se row existe ou gap lock se ausente.
        // Elimina corrida de insert duplo com mesmo id (espelha user-repository.drizzle.ts:239-253).
        const existing = await tx
          .select({ id: schema.authRole.id })
          .from(schema.authRole)
          .where(eq(schema.authRole.id, row.id))
          .for('update');

        if (existing.length > 0) {
          // UPDATE by PK. Se o name mudou para um ja existente, auth_role_name_idx lanca
          // ER_DUP_ENTRY -> capturado abaixo como role-repo-unavailable (Decisao 2 do 000-request).
          await tx
            .update(schema.authRole)
            .set({
              name: row.name,
              description: row.description,
              status: row.status,
              updatedAt: row.updatedAt,
            })
            .where(eq(schema.authRole.id, row.id));
        } else {
          await tx.insert(schema.authRole).values(row);
        }

        // ── Fase 2: Upsert auth_permission por name (serial, ignore-then-reselect) ──
        // Loop serial (nao Promise.all — evita deadlock no name_idx — blueprint §2).
        const permissionIds: string[] = [];
        for (const perm of role.permissions) {
          // `perm` e uma branded string; passamos como string raw para a query
          const permId = await resolvePermissionId(tx, perm as unknown as string, now);
          permissionIds.push(permId);
        }

        // ── Fase 3: Replace auth_role_permission ─────────────────────────────
        // DELETE todas as associacoes atuais do role (idempotente).
        // INSERT batch das novas; skip se lista vazia (mysql2 lanca em values([])).
        await tx
          .delete(schema.authRolePermission)
          .where(eq(schema.authRolePermission.roleId, row.id));

        if (permissionIds.length > 0) {
          await tx.insert(schema.authRolePermission).values(
            permissionIds.map((permissionId) => ({
              roleId: row.id,
              permissionId,
            })),
          );
        }
      });

      return ok(undefined);
    } catch (cause) {
      // auth_role_name_idx dup -> role-repo-unavailable (Decisao 2 do 000-request — YAGNI).
      // Outros erros (FK RESTRICT 1451/1452, I/O) -> role-repo-unavailable via generic catch.
      process.stderr.write(`[role-repo:save] ${String(cause)}\n`);
      return err('role-repo-unavailable');
    }
  };

  // isInUse: EXISTS na juncao auth_user_role por role_id (usa auth_urt_role_idx).
  // LIMIT 1 — basta uma atribuicao para o papel estar "em uso" (FR-012, archive).
  const isInUse = async (id: RoleId): Promise<Result<boolean, RoleRepositoryError>> =>
    safe('isInUse', async () => {
      const rows = await db
        .select({ roleId: schema.authUserRole.roleId })
        .from(schema.authUserRole)
        .where(eq(schema.authUserRole.roleId, id as unknown as string))
        .limit(1);
      return rows.length > 0;
    });

  const repository: RoleRepository = { save, findById, list, isInUse };

  return { repository };
};
