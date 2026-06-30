/**
 * Adapters InMemory do `ActReader` (módulo partners) — teste/CLI.
 *
 * `makeInMemoryActReader` — store semeável com read-records explícitos (seed).
 * `makeActReaderFromRepository` — deriva leitura do ActRepository in-memory
 *   (RW split in-memory: writer = repository, reader = este adapter).
 *   `legacyId = null` e timestamps = epoch (sem persistência real em memória).
 *   Espelha `supplier-reader.in-memory.ts`.
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type {
  ActReader,
  ActReadRecord,
  ActReaderError,
} from '#src/modules/partners/application/ports/act-reader.ts';
import type { ActRepository } from '#src/modules/partners/domain/act/repository.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';
import type { ActId } from '#src/modules/partners/domain/act/act-id.ts';

export const makeInMemoryActReader = (seed: readonly ActReadRecord[] = []): ActReader => {
  const map = new Map<ActId, ActReadRecord>();
  for (const record of seed) map.set(record.act.id, record);

  return {
    getById: async (id) => ok(map.get(id) ?? null),
    list: async () => ok([...map.values()]),
  };
};

/** Deriva um ActReader a partir de um ActRepository in-memory (RW split em memória). */
export const makeActReaderFromRepository = (repo: ActRepository): ActReader => {
  const EPOCH = new Date(0);

  const toRecord = (act: Act): ActReadRecord => ({
    act,
    legacyId: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  });

  return {
    getById: async (id) => {
      const r = await repo.findById(id);
      if (!r.ok) return err('act-read-unavailable' satisfies ActReaderError);
      return ok(r.value === null ? null : toRecord(r.value));
    },
    list: async () => {
      const r = await repo.list();
      if (!r.ok) return err('act-read-unavailable' satisfies ActReaderError);
      return ok(r.value.map(toRecord));
    },
  };
};
