/**
 * Adapter InMemory de `ContractCountStore` (US6b). `Map<contractorRef, count>` + `Set<eventId>`
 * de aplicados (idempotência por eventId — single-thread torna o dedup atômico por construção).
 * Serve testes/CLI e o driver memory do worker. ASCII puro.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { ContractCountStore } from '#src/modules/partners/application/ports/contract-count-store.ts';

export const makeInMemoryContractCountStore = (): ContractCountStore => {
  const counts = new Map<string, number>();
  const applied = new Set<string>();

  return {
    applyDelta: async ({ contractorRef, delta, eventId }) => {
      if (applied.has(eventId)) return ok(undefined); // dedup: evento já processado
      applied.add(eventId);
      counts.set(contractorRef, (counts.get(contractorRef) ?? 0) + delta);
      return ok(undefined);
    },
    getCount: async (contractorRef) => ok(counts.get(contractorRef) ?? 0),
  };
};
