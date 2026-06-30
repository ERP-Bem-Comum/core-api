/**
 * Adapter InMemory do `CollaboratorRepository` (módulo partners). Para teste/CLI.
 *
 * `Map<CollaboratorId, Collaborator>`. `save` recusa CPF e email duplicados com id
 * diferente (espelha os UNIQUE de `par_collaborators.cpf`/`.email` que o adapter
 * Drizzle terá). `findByCpf`/`findByEmail` por varredura (cardinalidade modesta — ADR-0031).
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type { CollaboratorRepository } from '#src/modules/partners/domain/collaborator/repository.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';

export type InMemoryCollaboratorStore = Readonly<{
  repository: CollaboratorRepository;
  clear: () => void;
}>;

export const makeInMemoryCollaboratorStore = (): InMemoryCollaboratorStore => {
  const map = new Map<CollaboratorId, Collaborator>();

  const repository: CollaboratorRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findByCpf: async (cpf) => ok([...map.values()].find((c) => c.cpf === cpf) ?? null),
    findByEmail: async (email) => ok([...map.values()].find((c) => c.email === email) ?? null),
    list: async () => ok([...map.values()]),
    save: async (collaborator) => {
      for (const existing of map.values()) {
        if (existing.id === collaborator.id) continue;
        if (existing.cpf === collaborator.cpf) return err('collaborator-cpf-duplicate');
        if (existing.email === collaborator.email) return err('collaborator-email-duplicate');
      }
      map.set(collaborator.id, collaborator);
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
