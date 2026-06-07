/**
 * Roda a contract-suite de RoleRepository contra o InMemory + casos especificos do store.
 * Tickets: AUTH-REPO-ROLE (base) · AUTH-ROLE-REPO-CRUD (isInUse via markInUse). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import { runRoleRepositoryContract } from './role-repository.contract.ts';

runRoleRepositoryContract('InMemory', {
  make: () => {
    const store = makeInMemoryRoleStore();
    return { repository: store.repository };
  },
});

describe('InMemoryRoleStore — isInUse via markInUse', () => {
  const perm = (raw: string): Permission.Permission => {
    const r = Permission.parse(raw);
    if (!r.ok) throw new Error('fixture perm');
    return r.value;
  };

  it('AUTH-ROLE-REPO-CRUD: isInUse=true apos markInUse; false apos clearUsage', async () => {
    const store = makeInMemoryRoleStore();
    const createR = Role.create({
      id: RoleId.generate(),
      name: 'Em Uso',
      permissions: [perm('contract:delete')],
    });
    assert.equal(createR.ok, true);
    if (!createR.ok) return;
    const role = createR.value;
    await store.repository.save(role);

    store.markInUse(role.id);
    const used = await store.repository.isInUse(role.id);
    assert.equal(used.ok, true);
    if (used.ok) assert.equal(used.value, true);

    store.clearUsage();
    const free = await store.repository.isInUse(role.id);
    assert.equal(free.ok, true);
    if (free.ok) assert.equal(free.value, false);
  });
});
