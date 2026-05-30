// Adapter Drizzle de LoginLockoutStore (modulo auth, BE-REC-001). Espelha os demais repos auth.
//
//   1. Sem Clock — o AccountLockout carrega lockedUntil.
//   2. Upsert por user_id (PK): SELECT FOR UPDATE -> UPDATE (failed_attempts/locked_until) ou INSERT.
//      ADR-0020 — sem ON DUPLICATE KEY.
//   3. findByUserId: PK (type=const) via safe(). Null -> ok(null).
//
// ADR-0014: so auth_*. Boundary: try/catch -> Result.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  LoginLockoutStore,
  LoginLockoutStoreError,
} from '../../../application/ports/login-lockout-store.ts';
import type { AccountLockout } from '../../../domain/session/account-lockout.ts';
import type { UserId } from '../../../domain/identity/user-id.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  accountLockoutFromRow,
  accountLockoutToInsert,
} from '../mappers/account-lockout.mapper.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, LoginLockoutStoreError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[login-lockout-repo:${ctx}] ${String(cause)}\n`);
    return err('lockout-store-failed');
  }
};

export const createDrizzleLoginLockoutStore = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Readonly<{ repository: LoginLockoutStore }> => {
  const { db, schema } = handle;

  const findByUserId = async (
    userId: UserId,
  ): Promise<Result<AccountLockout | null, LoginLockoutStoreError>> =>
    safe('findByUserId', async () => {
      const rows = await db
        .select()
        .from(schema.authLoginLockout)
        .where(eq(schema.authLoginLockout.userId, userId as unknown as string))
        .limit(1);

      const row = rows[0];
      if (row === undefined) return null;

      const r = accountLockoutFromRow(row);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  const save = async (lockout: AccountLockout): Promise<Result<void, LoginLockoutStoreError>> => {
    try {
      await db.transaction(async (tx) => {
        const existing = await tx
          .select({ userId: schema.authLoginLockout.userId })
          .from(schema.authLoginLockout)
          .where(eq(schema.authLoginLockout.userId, lockout.userId as unknown as string))
          .for('update');

        if (existing.length > 0) {
          await tx
            .update(schema.authLoginLockout)
            .set({ failedAttempts: lockout.failedAttempts, lockedUntil: lockout.lockedUntil })
            .where(eq(schema.authLoginLockout.userId, lockout.userId as unknown as string));
        } else {
          await tx.insert(schema.authLoginLockout).values(accountLockoutToInsert(lockout));
        }
      });
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[login-lockout-repo:save] ${String(cause)}\n`);
      return err('lockout-store-failed');
    }
  };

  return { repository: { findByUserId, save } };
};
