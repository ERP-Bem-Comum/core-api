/**
 * W0 (RED) - roda a contract-suite de RefreshTokenRepository contra o InMemory.
 * Ticket: AUTH-REPO-SESSION. DEVE FALHAR em W0. ASCII puro.
 */

import { makeInMemoryRefreshTokenStore } from '#src/modules/auth/adapters/persistence/repos/refresh-token-repository.in-memory.ts';
import { runRefreshTokenRepositoryContract } from './refresh-token-repository.contract.ts';

runRefreshTokenRepositoryContract('InMemory', {
  make: () => {
    const store = makeInMemoryRefreshTokenStore();
    // InMemory não tem FK — seedUser é no-op (Drizzle insere o auth_user pai).
    return {
      repository: store.repository,
      seedUser: async () => {
        await Promise.resolve();
      },
    };
  },
});
