/**
 * Adapter InMemory de ProvisionedUserStore (modulo auth). `Map<legacyId, {user, legacyId}>`.
 * Para testes do use case provisionLegacyUser. Idempotente por legacy_id (skip). ASCII puro.
 */

import { ok } from '../../../../../shared/primitives/result.ts';
import type { ProvisionedUserStore } from '../../../application/ports/provisioned-user-store.ts';
import type { ActiveUser } from '../../../domain/identity/user/types.ts';

export type ProvisionedEntry = Readonly<{ user: ActiveUser; legacyId: number }>;

export type InMemoryProvisionedUserStore = Readonly<{
  store: ProvisionedUserStore;
  saved: () => readonly ProvisionedEntry[];
  clear: () => void;
}>;

export const makeInMemoryProvisionedUserStore = (): InMemoryProvisionedUserStore => {
  const map = new Map<number, ProvisionedEntry>();

  const store: ProvisionedUserStore = {
    findByLegacyId: async (legacyId) => {
      const entry = map.get(legacyId);
      return ok(entry === undefined ? null : entry.user.id);
    },
    // Idempotente: se o legacy_id ja existe, no-op (preserva o registro original).
    provision: async (user, legacyId) => {
      if (!map.has(legacyId)) map.set(legacyId, { user, legacyId });
      return ok(undefined);
    },
  };

  return {
    store,
    saved: () => [...map.values()],
    clear: () => {
      map.clear();
    },
  };
};
