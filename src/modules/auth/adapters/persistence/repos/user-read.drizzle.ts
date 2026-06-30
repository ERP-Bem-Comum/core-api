// Adapter Drizzle do AuthUserReadPort (módulo auth) — LEITURA read-only (#207).
//
//   - SELECT id, name FROM auth_user WHERE id = ? (limit 1).
//   - id inexistente → ok(null). name pode ser null (coluna nullable).
//   - Falha de infra → err('auth-user-read-unavailable'). Boundary: try/catch → Result.
//
// ADR-0014: só lê `auth_*` (devolve a projeção mínima {id,name}, nunca row cru). ADR-0020: SELECT.
// Zero escrita. Zero throw cruzando a borda. Espelha partners/contractor-read.drizzle.ts.

import { and, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  AuthUserReadPort,
  ApproverAuthorityReadPort,
  AuthUserReadError,
  AuthUserNameView,
  ApproverAuthorityView,
} from '#src/modules/auth/application/ports/user-read.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';

// Permissão canônica que habilita aprovação de pagamento (auth_permission.name).
const APPROVE_PERMISSION = 'payable:approve';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[auth-user-read:${scope}] ${String(cause)}\n`);
};

// MAX das alçadas ignorando null; conjunto sem valor definido → null (sem alçada).
const maxLimit = (limits: readonly (number | null)[]): number | null => {
  const defined = limits.filter((c): c is number => c !== null);
  return defined.length === 0 ? null : Math.max(...defined);
};

export const createDrizzleUserReadStore = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): AuthUserReadPort & ApproverAuthorityReadPort => {
  const { db, schema } = handle;

  const getUserName = async (
    id: string,
  ): Promise<Result<AuthUserNameView | null, AuthUserReadError>> => {
    try {
      const rows = await db
        .select({ id: schema.authUser.id, name: schema.authUser.name })
        .from(schema.authUser)
        .where(eq(schema.authUser.id, id))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      return ok({ id: row.id, name: row.name });
    } catch (cause) {
      logRead('getUserName', cause);
      return err('auth-user-read-unavailable');
    }
  };

  // Papéis aprovadores (com payable:approve) de um usuário + suas alçadas.
  // Invariante FR-012: papel archived não é atribuível (archive bloqueado se in-use),
  // logo todo papel em auth_user_role é active — sem filtro de status necessário.
  const approverLimitsOf = async (userId: string): Promise<readonly (number | null)[]> => {
    const rows = await db
      .select({ limit: schema.authRole.approvalLimitCents })
      .from(schema.authUserRole)
      .innerJoin(schema.authRole, eq(schema.authUserRole.roleId, schema.authRole.id))
      .innerJoin(
        schema.authRolePermission,
        eq(schema.authRolePermission.roleId, schema.authRole.id),
      )
      .innerJoin(
        schema.authPermission,
        eq(schema.authRolePermission.permissionId, schema.authPermission.id),
      )
      .where(
        and(
          eq(schema.authUserRole.userId, userId),
          eq(schema.authPermission.name, APPROVE_PERMISSION),
        ),
      );
    return rows.map((r) => r.limit);
  };

  const getApproverAuthority = async (
    userId: string,
  ): Promise<Result<ApproverAuthorityView | null, AuthUserReadError>> => {
    try {
      const userRows = await db
        .select({ id: schema.authUser.id })
        .from(schema.authUser)
        .where(eq(schema.authUser.id, userId))
        .limit(1);
      if (userRows[0] === undefined) return ok(null);

      const limits = await approverLimitsOf(userId);
      return ok({ userId, canApprove: limits.length > 0, limitCents: maxLimit(limits) });
    } catch (cause) {
      logRead('getApproverAuthority', cause);
      return err('auth-user-read-unavailable');
    }
  };

  const listApproversWithAuthority = async (): Promise<
    Result<readonly ApproverAuthorityView[], AuthUserReadError>
  > => {
    try {
      const rows = await db
        .select({
          userId: schema.authUserRole.userId,
          limit: schema.authRole.approvalLimitCents,
        })
        .from(schema.authUserRole)
        .innerJoin(schema.authRole, eq(schema.authUserRole.roleId, schema.authRole.id))
        .innerJoin(
          schema.authRolePermission,
          eq(schema.authRolePermission.roleId, schema.authRole.id),
        )
        .innerJoin(
          schema.authPermission,
          eq(schema.authRolePermission.permissionId, schema.authPermission.id),
        )
        .where(eq(schema.authPermission.name, APPROVE_PERMISSION));

      const byUser = new Map<string, (number | null)[]>();
      for (const r of rows) {
        const arr = byUser.get(r.userId) ?? [];
        arr.push(r.limit);
        byUser.set(r.userId, arr);
      }
      const result: ApproverAuthorityView[] = [...byUser.entries()].map(([userId, limits]) => ({
        userId,
        canApprove: true,
        limitCents: maxLimit(limits),
      }));
      return ok(result);
    } catch (cause) {
      logRead('listApproversWithAuthority', cause);
      return err('auth-user-read-unavailable');
    }
  };

  return { getUserName, getApproverAuthority, listApproversWithAuthority };
};
