/**
 * Adapter InMemory do `ActRepository` (Acordo de Cooperação Técnica). Para teste/CLI.
 *
 * `Map<ActId, Act>`. `save` recusa `actNumber` duplicado com id diferente
 * (espelha o UNIQUE de `par_acts.act_number`).
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type { ActRepository } from '#src/modules/partners/domain/act/repository.ts';
import type { ActId } from '#src/modules/partners/domain/act/act-id.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';

export type InMemoryActStore = Readonly<{
  repository: ActRepository;
  clear: () => void;
}>;

export const makeInMemoryActStore = (): InMemoryActStore => {
  const map = new Map<ActId, Act>();

  const repository: ActRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findByActNumber: async (actNumber) =>
      ok([...map.values()].find((a) => a.actNumber === actNumber) ?? null),
    list: async () => ok([...map.values()]),
    save: async (act) => {
      for (const existing of map.values()) {
        if (existing.id === act.id) continue;
        if (existing.actNumber === act.actNumber) return err('act-number-duplicate');
      }
      map.set(act.id, act);
      return ok(undefined);
    },
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
