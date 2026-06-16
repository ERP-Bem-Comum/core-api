/**
 * Adapter InMemory de CollaboratorInviteTokenRepository (módulo partners, #43).
 * `Map<id, CollaboratorInviteToken>`. `findByTokenHash`/`findUnusedByCollaboratorId` por varredura.
 * Para testes/CLI. Espelha `password-reset-token-repository.in-memory.ts` do auth. ASCII puro.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { CollaboratorInviteTokenRepository } from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteToken } from '#src/modules/partners/domain/collaborator/invite-token.ts';

export type InMemoryCollaboratorInviteTokenStore = Readonly<{
  repository: CollaboratorInviteTokenRepository;
  clear: () => void;
}>;

export const makeInMemoryCollaboratorInviteTokenStore =
  (): InMemoryCollaboratorInviteTokenStore => {
    const map = new Map<string, CollaboratorInviteToken>();

    const repository: CollaboratorInviteTokenRepository = {
      save: async (token) => {
        map.set(token.id, token);
        return ok(undefined);
      },
      findByTokenHash: async (tokenHash) =>
        ok([...map.values()].find((t) => t.tokenHash === tokenHash) ?? null),
      findUnusedByCollaboratorId: async (collaboratorId) =>
        ok(
          [...map.values()].filter((t) => t.collaboratorId === collaboratorId && t.usedAt === null),
        ),
    };

    return {
      repository,
      clear: () => {
        map.clear();
      },
    };
  };
