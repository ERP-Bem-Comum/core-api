/**
 * Adapter InMemory de `ContractCountStore` (US6b). `Map<contractorRef, count>` + `Set<eventId>`
 * de aplicados (idempotência por eventId — single-thread torna o dedup atômico por construção).
 * Serve testes/CLI e o driver memory do worker. `seed` pré-popula contagens (driver memory da
 * borda HTTP, #105). ASCII puro.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { ContractCountStore } from '#src/modules/partners/application/ports/contract-count-store.ts';

export const makeInMemoryContractCountStore = (
  seed: readonly { contractorRef: string; activeCount: number }[] = [],
): ContractCountStore => {
  const counts = new Map<string, number>(seed.map((s) => [s.contractorRef, s.activeCount]));
  const applied = new Set<string>();

  return {
    applyDelta: async ({ contractorRef, delta, eventId }) => {
      if (applied.has(eventId)) return ok(undefined); // dedup: evento já processado
      applied.add(eventId);
      counts.set(contractorRef, (counts.get(contractorRef) ?? 0) + delta);
      return ok(undefined);
    },
    getCount: async (contractorRef) => ok(counts.get(contractorRef) ?? 0),
    setCount: async ({ contractorRef, activeCount }) => {
      counts.set(contractorRef, activeCount); // absoluto: sobrescreve (idempotente, reconcilia drift)
      return ok(undefined);
    },
    getCounts: async (contractorRefs) => {
      const out = new Map<string, number>();
      for (const ref of contractorRefs) {
        const v = counts.get(ref);
        if (v !== undefined) out.set(ref, v);
      }
      return ok(out);
    },
  };
};
