/**
 * W0 (RED) - roda a contract-suite de RoleRepository contra o InMemory.
 * Ticket: AUTH-REPO-ROLE. DEVE FALHAR em W0. ASCII puro.
 */

import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { runRoleRepositoryContract } from './role-repository.contract.ts';

runRoleRepositoryContract('InMemory', {
  make: () => {
    const store = makeInMemoryRoleStore();
    return { repository: store.repository };
  },
});
