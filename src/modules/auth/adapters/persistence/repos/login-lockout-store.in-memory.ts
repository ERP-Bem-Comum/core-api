/**
 * Adapter InMemory de LoginLockoutStore (modulo auth, BE-REC-001).
 *
 * Map por `userId`. Para testes/CLI e, por ora, tambem para o driver mysql ate existir um adapter
 * persistente (follow-up CTR-AUTH-LOCKOUT-PERSISTENCE) - mesma limitacao do rate-limit in-memory:
 * nao compartilha entre instancias nem sobrevive a restart. ASCII puro.
 */

import { ok } from '../../../../../shared/primitives/result.ts';
import type { AccountLockout } from '../../../domain/session/account-lockout.ts';
import type { LoginLockoutStore } from '../../../application/ports/login-lockout-store.ts';

export const makeInMemoryLoginLockoutStore = (): LoginLockoutStore => {
  const byUser = new Map<string, AccountLockout>();
  return {
    findByUserId: async (userId) => ok(byUser.get(userId) ?? null),
    save: async (lockout) => {
      byUser.set(lockout.userId, lockout);
      return ok(undefined);
    },
  };
};
