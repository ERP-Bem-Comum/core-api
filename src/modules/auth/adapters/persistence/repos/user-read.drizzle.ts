// Adapter Drizzle do AuthUserReadPort (módulo auth) — LEITURA read-only (#207).
//
//   - SELECT id, name FROM auth_user WHERE id = ? (limit 1).
//   - id inexistente → ok(null). name pode ser null (coluna nullable).
//   - Falha de infra → err('auth-user-read-unavailable'). Boundary: try/catch → Result.
//
// ADR-0014: só lê `auth_*` (devolve a projeção mínima {id,name}, nunca row cru). ADR-0020: SELECT.
// Zero escrita. Zero throw cruzando a borda. Espelha partners/contractor-read.drizzle.ts.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  AuthUserReadPort,
  AuthUserReadError,
  AuthUserNameView,
} from '#src/modules/auth/application/ports/user-read.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[auth-user-read:${scope}] ${String(cause)}\n`);
};

export const createDrizzleUserReadStore = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): AuthUserReadPort => {
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

  return { getUserName };
};
