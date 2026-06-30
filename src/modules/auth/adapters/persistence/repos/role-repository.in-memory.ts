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
  /** Marca um papel como atribuido (simula a juncao auth_user_role para testes de isInUse). */
  markInUse: (id: RoleId) => void;
  /** Limpa as marcacoes de uso. */
  clearUsage: () => void;
}>;

export const makeInMemoryRoleStore = (): InMemoryRoleStore => {
  const map = new Map<RoleId, Role>();
  const inUse = new Set<RoleId>();

  const repository: RoleRepository = {
    save: async (role) => {
      map.set(role.id, role);
      return ok(undefined);
    },
    findById: async (id) => ok(map.get(id) ?? null),
    list: async () => ok([...map.values()]),
    isInUse: async (id) => ok(inUse.has(id)),
  };

  return {
    repository,
    clear: () => {
      map.clear();
      inUse.clear();
    },
    markInUse: (id) => {
      inUse.add(id);
    },
    clearUsage: () => {
      inUse.clear();
    },
  };
};
