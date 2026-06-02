/**
 * Adapter InMemory generico de LegacyEntityStore (modulo partners). `Map<legacyId, Ref>`.
 * Para testes + execucao offline do orquestrador (3b-ii). Idempotente por legacy_id (skip). ASCII puro.
 */

import { ok } from '../../../../../shared/primitives/result.ts';
import type { LegacyEntityStore } from '../../../application/ports/legacy-entity-store.ts';

export const makeInMemoryLegacyEntityStore = <A, Ref>(
  refOf: (aggregate: A) => Ref,
): LegacyEntityStore<A, Ref> => {
  const map = new Map<number, Ref>();

  return {
    findByLegacyId: async (legacyId) => ok(map.get(legacyId) ?? null),
    // Idempotente: se o legacy_id ja existe, no-op (preserva a 1a ref).
    provision: async (aggregate, legacyId) => {
      if (map.has(legacyId)) return ok('already-exists');
      map.set(legacyId, refOf(aggregate));
      return ok('created');
    },
  };
};
