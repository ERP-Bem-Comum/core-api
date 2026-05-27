/**
 * Adapter InMemory de RefreshTokenRepository (modulo auth). `Map<RefreshTokenId, RefreshToken>`.
 * `findByTokenHash` por varredura. Para testes e CLI. ASCII puro.
 */

import { ok } from '../../../../../shared/primitives/result.ts';
import type { RefreshTokenRepository } from '../../../domain/session/refresh-token-repository.ts';
import type { RefreshToken } from '../../../domain/session/refresh-token.ts';
import type { RefreshTokenId } from '../../../domain/session/refresh-token-id.ts';

export type InMemoryRefreshTokenStore = Readonly<{
  repository: RefreshTokenRepository;
  clear: () => void;
}>;

export const makeInMemoryRefreshTokenStore = (): InMemoryRefreshTokenStore => {
  const map = new Map<RefreshTokenId, RefreshToken>();

  const repository: RefreshTokenRepository = {
    save: async (token) => {
      map.set(token.id, token);
      return ok(undefined);
    },
    findById: async (id) => ok(map.get(id) ?? null),
    findByTokenHash: async (tokenHash) =>
      ok([...map.values()].find((t) => t.tokenHash === tokenHash) ?? null),
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
