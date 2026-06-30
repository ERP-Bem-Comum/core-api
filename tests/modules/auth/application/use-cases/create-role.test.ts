/**
 * W0 (RED) - AUTH-CREATE-ROLE: use case createRole (US5 da spec 006).
 *
 * DEVE FALHAR em W0 - o use case create-role.ts ainda nao existe.
 * Cria um papel novo: valida permissions (catalogo) + nome (RoleName) via dominio, checa
 * unicidade de nome via repo.list() (sem estender o port - YAGNI) e persiste. Usa o adapter
 * InMemory real de RoleRepository. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createRole } from '#src/modules/auth/application/use-cases/create-role.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import type { RoleRepository } from '#src/modules/auth/domain/authorization/role-repository.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import { ok, err } from '#src/shared/primitives/result.ts';

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

describe('AUTH-CREATE-ROLE — createRole', () => {
  it('cria um papel com nome unico + permissions validas (ok, id, save chamado)', async () => {
    const store = makeInMemoryRoleStore();
    const result = await createRole({ roleRepository: store.repository })({
      name: 'gerente',
      permissions: ['role:read', 'user:list'],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(typeof result.value.id, 'string');
    assert.ok(result.value.id.length > 0);

    const persisted = await store.repository.list();
    assert.equal(persisted.ok, true);
    if (!persisted.ok) return;
    assert.equal(persisted.value.length, 1);
    const saved = persisted.value[0];
    assert.ok(saved);
    assert.equal(String(saved.name), 'gerente');
    assert.equal(String(saved.id), result.value.id);
    assert.deepEqual([...saved.permissions].map(String).sort(), ['role:read', 'user:list']);
  });

  it('nome duplicado (apos normalizacao do RoleName: trim + colapso de espacos) -> role-name-duplicate (sem save)', async () => {
    const store = makeInMemoryRoleStore();
    // RoleName normaliza trim + colapsa espacos, mas e CASE-SENSITIVE. Para garantir o match,
    // o existente e o novo tem o mesmo nome canonico apos normalizacao (espacos extras colapsam).
    await store.repository.save(makeRole('gerente', ['role:read']));

    const result = await createRole({ roleRepository: store.repository })({
      name: '  gerente  ',
      permissions: ['user:list'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-name-duplicate');

    // Nao persistiu o duplicado: continua so o original.
    const persisted = await store.repository.list();
    assert.equal(persisted.ok, true);
    if (!persisted.ok) return;
    assert.equal(persisted.value.length, 1);
  });

  it('permissao fora do catalogo -> role-permission-not-in-catalog', async () => {
    const store = makeInMemoryRoleStore();
    const result = await createRole({ roleRepository: store.repository })({
      name: 'estranho',
      permissions: ['nonexistent:permission'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-permission-not-in-catalog');
  });

  it('permissao com formato invalido -> role-permission-not-in-catalog', async () => {
    const store = makeInMemoryRoleStore();
    const result = await createRole({ roleRepository: store.repository })({
      name: 'estranho',
      permissions: ['naoTemDoisPontos'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-permission-not-in-catalog');
  });

  it('nome vazio -> role-name-invalid', async () => {
    const store = makeInMemoryRoleStore();
    const result = await createRole({ roleRepository: store.repository })({
      name: '   ',
      permissions: ['role:read'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-name-invalid');
  });

  it('propaga o erro do repositorio (list)', async () => {
    const failing: RoleRepository = {
      save: () => Promise.resolve(ok(undefined)),
      findById: () => Promise.resolve(err('role-repo-unavailable')),
      list: () => Promise.resolve(err('role-repo-unavailable')),
      isInUse: () => Promise.resolve(err('role-repo-unavailable')),
    };
    const result = await createRole({ roleRepository: failing })({
      name: 'gerente',
      permissions: ['role:read'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-repo-unavailable');
  });

  it('propaga o erro do repositorio (save)', async () => {
    const failing: RoleRepository = {
      save: () => Promise.resolve(err('role-repo-unavailable')),
      findById: () => Promise.resolve(err('role-repo-unavailable')),
      list: () => Promise.resolve(ok([])),
      isInUse: () => Promise.resolve(err('role-repo-unavailable')),
    };
    const result = await createRole({ roleRepository: failing })({
      name: 'gerente',
      permissions: ['role:read'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-repo-unavailable');
  });
});
