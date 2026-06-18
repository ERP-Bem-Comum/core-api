/**
 * Adapter InMemory de `CollaboratorInviteTokenRepository` (US5). `Map<id, token>`.
 * `markUsed` é atômico por construção (single-thread): só transiciona `pending → used`,
 * devolvendo `false` se já consumido (replay). Serve testes/CLI e o driver memory. ASCII puro.
 *
 * PARTNERS-INVITE-DOMAIN-EVENT (ADR-0047): `saveWithEvents(token, events)` grava o token E publica
 * os eventos num `EmailOutboxPort` opcionalmente INJETADO (espelha makeInMemoryPasswordResetTokenStore
 * do auth). Atomico em memoria (token gravado, depois eventos). O invariante de atomicidade REAL
 * (rollback) e coberto pela suite Drizzle/MySQL. Sem outbox injetado: os eventos sao descartados (no-op).
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type {
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
  CollaboratorInviteOutboxMessage,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteToken } from '#src/modules/partners/domain/collaborator/invite-token.ts';
import type { CollaboratorInviteTokenId } from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import type {
  EmailOutboxPort,
  OutboxMessage,
} from '#src/modules/partners/application/ports/email-outbox.ts';

export type InMemoryCollaboratorInviteTokenStore = Readonly<{
  repository: CollaboratorInviteTokenRepository;
  clear: () => void;
}>;

/**
 * makeInMemoryCollaboratorInviteTokenStore — opcionalmente recebe um `outbox` (EmailOutboxPort
 * InMemory) para inspecao em testes. Quando ausente, `saveWithEvents` apenas grava o token (eventos
 * no-op).
 */
export const makeInMemoryCollaboratorInviteTokenStore = (
  outbox?: EmailOutboxPort,
): InMemoryCollaboratorInviteTokenStore => {
  const map = new Map<CollaboratorInviteTokenId, CollaboratorInviteToken>();

  const saveWithEvents = async (
    token: CollaboratorInviteToken,
    events: readonly CollaboratorInviteOutboxMessage[],
  ): Promise<Result<void, CollaboratorInviteTokenRepositoryError>> => {
    map.set(token.id, token);
    if (outbox !== undefined && events.length > 0) {
      const appended = await outbox.append(events as readonly OutboxMessage[]);
      if (!appended.ok) return err('invite-token-repo-unavailable');
    }
    return ok(undefined);
  };

  const repository: CollaboratorInviteTokenRepository = {
    save: async (token) => {
      map.set(token.id, token);
      return ok(undefined);
    },
    saveWithEvents,
    findByTokenHash: async (tokenHash) =>
      ok([...map.values()].find((t) => t.tokenHash === tokenHash) ?? null),
    markUsed: async (id, usedAt) => {
      const current = map.get(id);
      if (current === undefined) return ok(false);
      if (current.usedAt !== null) return ok(false);
      map.set(id, { ...current, usedAt });
      return ok(true);
    },
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
