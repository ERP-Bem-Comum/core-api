/**
 * W0 (RED) - AUTH-LIST-ROLES: use case listRoles (US3 da spec 006).
 *
 * DEVE FALHAR em W0 - o use case list-roles.ts ainda nao existe.
 * Lista o agregado Role cru (dominio); o mapeamento p/ DTO HTTP fica na borda. Propaga o
 * erro do repositorio. Usa o adapter InMemory real de RoleRepository. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { listRoles } from '#src/modules/auth/application/use-cases/list-roles.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import type { RoleRepository } from '#src/modules/auth/domain/authorization/role-repository.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import { err } from '#src/shared/primitives/result.ts';

const makeRole = (name: string, permissions: readonly string[]): Role.Role => {
  const perms = permissions.map((p) => {
    const parsed = Permission.parse(p);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) throw new Error('unreachable');
    return parsed.value;
  });
  const role = Role.create({ id: RoleId.generate(), name, permissions: perms });
  assert.equal(role.ok, true);
  if (!role.ok) throw new Error('unreachable');
  return role.value;
};

describe('AUTH-LIST-ROLES — listRoles', () => {
  it('lista os papeis com suas permissoes', async () => {
    const store = makeInMemoryRoleStore();
    const admin = makeRole('admin', ['role:read', 'user:list']);
    const viewer = makeRole('viewer', ['role:read']);
    await store.repository.save(admin);
    await store.repository.save(viewer);

    const result = await listRoles({ roleRepository: store.repository })();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 2);
    const byName = new Map(result.value.map((r) => [String(r.name), r]));
    assert.deepEqual([...byName.get('admin')!.permissions].map(String).sort(), [
      'role:read',
      'user:list',
    ]);
    assert.deepEqual([...byName.get('viewer')!.permissions].map(String), ['role:read']);
  });

  it('lista vazia retorna ok([])', async () => {
    const store = makeInMemoryRoleStore();
    const result = await listRoles({ roleRepository: store.repository })();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 0);
  });

  it('propaga o erro do repositorio', async () => {
    const failing: RoleRepository = {
      save: () => Promise.resolve(err('role-repo-unavailable')),
      findById: () => Promise.resolve(err('role-repo-unavailable')),
      list: () => Promise.resolve(err('role-repo-unavailable')),
      isInUse: () => Promise.resolve(err('role-repo-unavailable')),
    };
    const result = await listRoles({ roleRepository: failing })();
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-repo-unavailable');
  });
});
