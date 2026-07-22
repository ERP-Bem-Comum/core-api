/**
 * Adapter InMemory do `ActiveContractorReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um conjunto semeado de refs; sem seed, devolve conjunto vazio.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type { ActiveContractorReadPort } from '../../application/ports/active-contractor-read.ts';

export const InMemoryActiveContractorRead = (
  seed: readonly string[] = [],
): ActiveContractorReadPort => ({
  listContractorsWithActiveContract: async () => ok(seed),
});
