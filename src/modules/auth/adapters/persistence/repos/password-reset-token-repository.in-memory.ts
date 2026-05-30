/**
 * Adapter InMemory de PasswordResetTokenRepository (modulo auth, BE-REC-003).
 * `Map<id, PasswordResetToken>`. `findByTokenHash`/`findUnusedByUserId` por varredura.
 * Para testes/CLI e, por ora, tambem o driver mysql ate o repo Drizzle ser fiado no composition.
 * ASCII puro.
 */

import { ok } from '../../../../../shared/primitives/result.ts';
import type { PasswordResetTokenRepository } from '../../../domain/session/password-reset-token-repository.ts';
import type { PasswordResetToken } from '../../../domain/session/password-reset-token.ts';

export type InMemoryPasswordResetTokenStore = Readonly<{
  repository: PasswordResetTokenRepository;
  clear: () => void;
}>;

export const makeInMemoryPasswordResetTokenStore = (): InMemoryPasswordResetTokenStore => {
  const map = new Map<string, PasswordResetToken>();

  const repository: PasswordResetTokenRepository = {
    save: async (token) => {
      map.set(token.id, token);
      return ok(undefined);
    },
    findByTokenHash: async (tokenHash) =>
      ok([...map.values()].find((t) => t.tokenHash === tokenHash) ?? null),
    findUnusedByUserId: async (userId) =>
      ok([...map.values()].filter((t) => t.userId === userId && t.usedAt === null)),
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
