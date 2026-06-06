/**
 * Adapter InMemory do `ActRepository` (módulo partners). Para teste/CLI.
 *
 * `Map<ActId, Act>`. `save` recusa CPF e email duplicados com id diferente
 * (espelha os UNIQUE de `par_acts.cpf`/`.email`).
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
    findByCpf: async (cpf) => ok([...map.values()].find((a) => a.cpf === cpf) ?? null),
    findByEmail: async (email) => ok([...map.values()].find((a) => a.email === email) ?? null),
    list: async () => ok([...map.values()]),
    save: async (act) => {
      for (const existing of map.values()) {
        if (existing.id === act.id) continue;
        if (existing.cpf === act.cpf) return err('act-cpf-duplicate');
        if (existing.email === act.email) return err('act-email-duplicate');
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
