/**
 * Adapter InMemory do `FinancierReader` — teste/CLI. Store semeável. Espelha `supplier-reader.in-memory.ts`.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type {
  FinancierReader,
  FinancierReadRecord,
} from '#src/modules/partners/application/ports/financier-reader.ts';
import type { FinancierId } from '#src/modules/partners/domain/financier/financier-id.ts';

export const makeInMemoryFinancierReader = (
  seed: readonly FinancierReadRecord[] = [],
): FinancierReader => {
  const map = new Map<FinancierId, FinancierReadRecord>();
  for (const record of seed) map.set(record.financier.id, record);

  return {
    getById: async (id) => ok(map.get(id) ?? null),
    list: async () => ok([...map.values()]),
  };
};
