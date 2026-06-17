/**
 * Adapter InMemory de `CollaboratorInviteTokenRepository` (US5). `Map<id, token>`.
 * `markUsed` é atômico por construção (single-thread): só transiciona `pending → used`,
 * devolvendo `false` se já consumido (replay). Serve testes/CLI e o driver memory. ASCII puro.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { CollaboratorInviteTokenRepository } from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteToken } from '#src/modules/partners/domain/collaborator/invite-token.ts';
import type { CollaboratorInviteTokenId } from '#src/modules/partners/domain/collaborator/invite-token-id.ts';

export type InMemoryCollaboratorInviteTokenStore = Readonly<{
  repository: CollaboratorInviteTokenRepository;
  clear: () => void;
}>;

export const makeInMemoryCollaboratorInviteTokenStore =
  (): InMemoryCollaboratorInviteTokenStore => {
    const map = new Map<CollaboratorInviteTokenId, CollaboratorInviteToken>();

    const repository: CollaboratorInviteTokenRepository = {
      save: async (token) => {
        map.set(token.id, token);
        return ok(undefined);
      },
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
