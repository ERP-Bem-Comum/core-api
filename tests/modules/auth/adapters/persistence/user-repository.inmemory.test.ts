/**
 * W0 (RED) - roda a contract-suite de UserRepository contra o adapter InMemory.
 *
 * Ticket: AUTH-REPO-USER. DEVE FALHAR em W0 (port + InMemory inexistentes). ASCII puro.
 */

import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { runUserRepositoryContract } from './user-repository.contract.ts';

runUserRepositoryContract('InMemory', {
  make: () => {
    const store = makeInMemoryUserStore();
    return { repository: store.repository, reader: store.reader };
  },
});
