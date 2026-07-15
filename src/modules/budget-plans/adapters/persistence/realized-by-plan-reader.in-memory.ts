/**
 * Adapter InMemory do `RealizedByPlanReader` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um mapa `ref -> realizedCents` semeado; sem seed, o Map é vazio e todo ref lido resolve a 0.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type { RealizedByPlanReader } from '../../application/ports/realized-by-plan-reader.ts';

export const InMemoryRealizedByPlanReader = (
  seed: Readonly<Record<string, number>> = {},
): RealizedByPlanReader => ({
  getByPlans: async (_refs) => ok(new Map<string, number>(Object.entries(seed))),
});
