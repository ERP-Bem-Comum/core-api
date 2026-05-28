/**
 * Adapter InMemory de RoleRepository (modulo auth). `Map<RoleId, Role>`. Para testes e CLI. ASCII puro.
 */

import { ok } from '../../../../../shared/primitives/result.ts';
import type { RoleRepository } from '../../../domain/authorization/role-repository.ts';
import type { Role } from '../../../domain/authorization/role.ts';
import type { RoleId } from '../../../domain/authorization/role-id.ts';

export type InMemoryRoleStore = Readonly<{
  repository: RoleRepository;
  clear: () => void;
}>;

export const makeInMemoryRoleStore = (): InMemoryRoleStore => {
  const map = new Map<RoleId, Role>();

  const repository: RoleRepository = {
    save: async (role) => {
      map.set(role.id, role);
      return ok(undefined);
    },
    findById: async (id) => ok(map.get(id) ?? null),
    list: async () => ok([...map.values()]),
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
