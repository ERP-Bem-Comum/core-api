// Adapter Drizzle de CollaboratorInviteTokenRepository (módulo partners, #43).
// Espelha o password-reset-token-repository.drizzle do auth (DUPLICADO — ADR-0006).
//
//   1. Sem Clock — o token carrega seus instantes (requested_at/expires_at/used_at).
//   2. Upsert por id: SELECT FOR UPDATE → UPDATE (só used_at no consume) ou INSERT. ADR-0020 — sem ODKU.
//   3. findByTokenHash: WHERE token_hash=? (par_invite_tokens_token_hash_idx UNIQUE, type=const).
//   4. findUnusedByCollaboratorId: WHERE collaborator_id=? AND used_at IS NULL (and()+isNull()).
//
// ADR-0020: sem ON DUPLICATE KEY. ADR-0014: só par_*. Boundary: try/catch → Result.

import { and, eq, isNull } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteToken } from '#src/modules/partners/domain/collaborator/invite-token.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { PartnersMysqlHandle } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import {
  inviteTokenFromRow,
  inviteTokenToInsert,
} from '#src/modules/partners/adapters/persistence/mappers/collaborator-invite-token.mapper.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, CollaboratorInviteTokenRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[collaborator-invite-token-repo:${ctx}] ${String(cause)}\n`);
    return err('collaborator-invite-token-repo-unavailable');
  }
};

const build = (
  row: Parameters<typeof inviteTokenFromRow>[0],
): Result<CollaboratorInviteToken, CollaboratorInviteTokenRepositoryError> => {
  const r = inviteTokenFromRow(row);
  if (!r.ok) {
    process.stderr.write(`[collaborator-invite-token-repo:mapper] ${r.error.tag}\n`);
    return err('collaborator-invite-token-repo-unavailable');
  }
  return ok(r.value);
};

export const createDrizzleCollaboratorInviteTokenStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Readonly<{ repository: CollaboratorInviteTokenRepository }> => {
  const { db, schema } = handle;

  const findByTokenHash = async (
    tokenHash: string,
  ): Promise<Result<CollaboratorInviteToken | null, CollaboratorInviteTokenRepositoryError>> =>
    safe('findByTokenHash', async () => {
      const rows = await db
        .select()
        .from(schema.parInviteTokens)
        .where(eq(schema.parInviteTokens.tokenHash, tokenHash))
        .limit(1);

      const row = rows[0];
      if (row === undefined) return null;

      const r = build(row);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  const findUnusedByCollaboratorId = async (
    collaboratorId: CollaboratorId,
  ): Promise<Result<readonly CollaboratorInviteToken[], CollaboratorInviteTokenRepositoryError>> =>
    safe('findUnusedByCollaboratorId', async () => {
      const rows = await db
        .select()
        .from(schema.parInviteTokens)
        .where(
          and(
            eq(schema.parInviteTokens.collaboratorId, collaboratorId as unknown as string),
            isNull(schema.parInviteTokens.usedAt),
          ),
        );

      const tokens: CollaboratorInviteToken[] = [];
      for (const row of rows) {
        const r = build(row);
        if (!r.ok) throw new Error(JSON.stringify(r.error));
        tokens.push(r.value);
      }
      return tokens;
    });

  const save = async (
    token: CollaboratorInviteToken,
  ): Promise<Result<void, CollaboratorInviteTokenRepositoryError>> => {
    try {
      await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: schema.parInviteTokens.id })
          .from(schema.parInviteTokens)
          .where(eq(schema.parInviteTokens.id, token.id as unknown as string))
          .for('update');

        if (existing.length > 0) {
          // UPDATE toca só used_at (único campo do ciclo de vida; o resto é imutável após emissão).
          await tx
            .update(schema.parInviteTokens)
            .set({ usedAt: token.usedAt })
            .where(eq(schema.parInviteTokens.id, token.id as unknown as string));
        } else {
          await tx.insert(schema.parInviteTokens).values(inviteTokenToInsert(token));
        }
      });
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[collaborator-invite-token-repo:save] ${String(cause)}\n`);
      return err('collaborator-invite-token-repo-unavailable');
    }
  };

  const repository: CollaboratorInviteTokenRepository = {
    save,
    findByTokenHash,
    findUnusedByCollaboratorId,
  };

  return { repository };
};
