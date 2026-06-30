/**
 * Adapter Drizzle de `CollaboratorInviteTokenRepository` (US5). Espelha o repo de token do auth.
 *
 *  1. `save`: INSERT (token recém-emitido; sem upsert — id sempre novo).
 *  2. `findByTokenHash`: WHERE token_hash=? (par_invite_tokens_token_hash_idx UNIQUE).
 *  3. `markUsed`: **UPDATE atômico** `SET used_at=? WHERE id=? AND used_at IS NULL` — o
 *     `affectedRows > 0` indica se ESTA chamada venceu a corrida (anti-replay). O `auth`
 *     (find→save sem essa guarda) NÃO tem essa atomicidade.
 *
 * ADR-0020: sem ON DUPLICATE KEY. ADR-0014: só par_*. Boundary: try/catch → Result.
 */

import { and, eq, isNull } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteToken } from '#src/modules/partners/domain/collaborator/invite-token.ts';
import type { CollaboratorInviteTokenId } from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import type { CollaboratorInviteOutboxMessage } from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import { inviteTokenFromRow, inviteTokenToInsert } from '../mappers/invite-token.mapper.ts';
import { appendEmailOutboxInTx } from './email-outbox-repository.drizzle.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, CollaboratorInviteTokenRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[invite-token-repo:${ctx}] ${String(cause)}\n`);
    return err('invite-token-repo-unavailable');
  }
};

export const createDrizzleCollaboratorInviteTokenStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Readonly<{ repository: CollaboratorInviteTokenRepository }> => {
  const { db, schema } = handle;

  const save = async (
    token: CollaboratorInviteToken,
  ): Promise<Result<void, CollaboratorInviteTokenRepositoryError>> =>
    safe('save', async () => {
      await db.insert(schema.parInviteTokens).values(inviteTokenToInsert(token));
    });

  // PARTNERS-INVITE-DOMAIN-EVENT (ADR-0047): salva o invite-token E grava os eventos no
  // par_email_outbox na MESMA transacao (atomicidade — ADR-0015). Se qualquer passo lancar, o
  // Drizzle faz rollback de tudo — token e evento somem juntos (sem token orfao sem evento, nem
  // evento orfao sem token).
  const saveWithEvents = async (
    token: CollaboratorInviteToken,
    events: readonly CollaboratorInviteOutboxMessage[],
  ): Promise<Result<void, CollaboratorInviteTokenRepositoryError>> => {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(schema.parInviteTokens).values(inviteTokenToInsert(token));
        await appendEmailOutboxInTx(tx, schema, events);
      });
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[invite-token-repo:saveWithEvents] ${String(cause)}\n`);
      return err('invite-token-repo-unavailable');
    }
  };

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

      const r = inviteTokenFromRow(row);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  const markUsed = async (
    id: CollaboratorInviteTokenId,
    usedAt: Date,
  ): Promise<Result<boolean, CollaboratorInviteTokenRepositoryError>> =>
    safe('markUsed', async () => {
      const res = await db
        .update(schema.parInviteTokens)
        .set({ usedAt })
        .where(
          and(
            eq(schema.parInviteTokens.id, id as unknown as string),
            isNull(schema.parInviteTokens.usedAt),
          ),
        );
      return res[0].affectedRows > 0;
    });

  const repository: CollaboratorInviteTokenRepository = {
    save,
    saveWithEvents,
    findByTokenHash,
    markUsed,
  };
  return { repository };
};
