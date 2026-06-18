// Adapter Drizzle de PasswordResetTokenRepository (modulo auth, BE-REC-003). Espelha refresh-token-repository.
//
//   1. Sem Clock — o token carrega seus instantes (requested_at/expires_at/used_at).
//   2. Upsert por id: SELECT FOR UPDATE -> UPDATE (so used_at no consume) ou INSERT. ADR-0020 — sem ODKU.
//   3. findByTokenHash: WHERE token_hash=? (auth_pr_token_hash_idx UNIQUE, type=const) via safe().
//   4. findUnusedByUserId: WHERE user_id=? AND used_at IS NULL (and()+isNull()) via safe().
//
// ADR-0020: sem ON DUPLICATE KEY. ADR-0014: so auth_*. Boundary: try/catch -> Result.

import { and, eq, isNull } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  PasswordResetTokenRepository,
  PasswordResetTokenRepositoryError,
  PasswordResetOutboxMessage,
} from '../../../domain/session/password-reset-token-repository.ts';
import type { PasswordResetToken } from '../../../domain/session/password-reset-token.ts';
import type { UserId } from '../../../domain/identity/user-id.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  passwordResetTokenFromRow,
  passwordResetTokenToInsert,
} from '../mappers/password-reset-token.mapper.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, PasswordResetTokenRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[password-reset-repo:${ctx}] ${String(cause)}\n`);
    return err('password-reset-token-repo-unavailable');
  }
};

const build = (
  row: Parameters<typeof passwordResetTokenFromRow>[0],
): Result<PasswordResetToken, PasswordResetTokenRepositoryError> => {
  const r = passwordResetTokenFromRow(row);
  if (!r.ok) {
    process.stderr.write(`[password-reset-repo:mapper] ${r.error.tag}\n`);
    return err('password-reset-token-repo-unavailable');
  }
  return ok(r.value);
};

export const createDrizzlePasswordResetTokenStore = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Readonly<{ repository: PasswordResetTokenRepository }> => {
  const { db, schema } = handle;

  const findByTokenHash = async (
    tokenHash: string,
  ): Promise<Result<PasswordResetToken | null, PasswordResetTokenRepositoryError>> =>
    safe('findByTokenHash', async () => {
      const rows = await db
        .select()
        .from(schema.authPasswordReset)
        .where(eq(schema.authPasswordReset.tokenHash, tokenHash))
        .limit(1);

      const row = rows[0];
      if (row === undefined) return null;

      const r = build(row);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  const findUnusedByUserId = async (
    userId: UserId,
  ): Promise<Result<readonly PasswordResetToken[], PasswordResetTokenRepositoryError>> =>
    safe('findUnusedByUserId', async () => {
      const rows = await db
        .select()
        .from(schema.authPasswordReset)
        .where(
          and(
            eq(schema.authPasswordReset.userId, userId as unknown as string),
            isNull(schema.authPasswordReset.usedAt),
          ),
        );

      const tokens: PasswordResetToken[] = [];
      for (const row of rows) {
        const r = build(row);
        if (!r.ok) throw new Error(JSON.stringify(r.error));
        tokens.push(r.value);
      }
      return tokens;
    });

  // Upsert do token DENTRO de uma tx ja aberta (reusado por save e saveWithEvents).
  // SELECT FOR UPDATE -> UPDATE (so used_at) ou INSERT. ADR-0020 — sem ON DUPLICATE KEY.
  const upsertTokenInTx = async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    token: PasswordResetToken,
  ): Promise<void> => {
    const existing = await tx
      .select({ id: schema.authPasswordReset.id })
      .from(schema.authPasswordReset)
      .where(eq(schema.authPasswordReset.id, token.id as unknown as string))
      .for('update');

    if (existing.length > 0) {
      // UPDATE toca só used_at (único campo do ciclo de vida; o resto é imutável após emissão).
      await tx
        .update(schema.authPasswordReset)
        .set({ usedAt: token.usedAt })
        .where(eq(schema.authPasswordReset.id, token.id as unknown as string));
    } else {
      await tx.insert(schema.authPasswordReset).values(passwordResetTokenToInsert(token));
    }
  };

  const save = async (
    token: PasswordResetToken,
  ): Promise<Result<void, PasswordResetTokenRepositoryError>> => {
    try {
      await db.transaction(async (tx) => {
        await upsertTokenInTx(tx, token);
      });
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[password-reset-repo:save] ${String(cause)}\n`);
      return err('password-reset-token-repo-unavailable');
    }
  };

  // AUTH-DOMAIN-OUTBOX (ADR-0047): salva o token E grava os eventos no auth_outbox na MESMA
  // transacao (atomicidade — ADR-0015). Se qualquer passo lancar, o Drizzle faz rollback de
  // tudo — token e evento somem juntos (sem token orfao sem evento, nem evento orfao sem token).
  const saveWithEvents = async (
    token: PasswordResetToken,
    events: readonly PasswordResetOutboxMessage[],
  ): Promise<Result<void, PasswordResetTokenRepositoryError>> => {
    try {
      await db.transaction(async (tx) => {
        await upsertTokenInTx(tx, token);
        await appendOutboxInTx(tx, schema, events);
      });
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[password-reset-repo:saveWithEvents] ${String(cause)}\n`);
      return err('password-reset-token-repo-unavailable');
    }
  };

  const repository: PasswordResetTokenRepository = {
    save,
    saveWithEvents,
    findByTokenHash,
    findUnusedByUserId,
  };

  return { repository };
};
