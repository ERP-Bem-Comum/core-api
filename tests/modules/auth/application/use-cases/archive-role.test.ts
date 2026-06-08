/**
 * W0 (RED) - AUTH-ARCHIVE-ROLE: use case archiveRole (US7 da spec 006).
 *
 * DEVE FALHAR em W0 - o use case archive-role.ts ainda nao existe.
 * Desativa (arquiva) um papel existente, tornando-o nao-atribuivel (status archived). Bloqueado
 * se o papel ainda estiver atribuido a usuarios (FR-012) -> role-in-use, sem save. Usa o adapter
 * InMemory real de RoleRepository (markInUse simula a juncao auth_user_role). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { archiveRole } from '#src/modules/auth/application/use-cases/archive-role.ts';
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

/** Store in-memory com 1 role semeado; devolve o id para os testes referenciarem. */
const seedStore = async (): Promise<{
  store: ReturnType<typeof makeInMemoryRoleStore>;
  gerenteId: string;
}> => {
  const store = makeInMemoryRoleStore();
  const gerente = makeRole('gerente', ['role:read', 'user:list']);
  await store.repository.save(gerente);
  return { store, gerenteId: String(gerente.id) };
};

describe('AUTH-ARCHIVE-ROLE — archiveRole', () => {
  it('arquiva um papel nao-usado (ok; status archived; persiste)', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await archiveRole({ roleRepository: store.repository })(gerenteId);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.status, 'archived');
    assert.equal(String(result.value.id), gerenteId);

    // Persistiu: a releitura traz o papel ja arquivado.
    const reread = await store.repository.findById(result.value.id);
    assert.equal(reread.ok, true);
    if (!reread.ok || reread.value === null) return assert.fail('papel sumiu');
    assert.equal(reread.value.status, 'archived');
  });

  it('papel ainda atribuido a usuarios -> role-in-use (sem save)', async () => {
    const { store, gerenteId } = await seedStore();
    const id = RoleId.rehydrate(gerenteId);
    assert.equal(id.ok, true);
    if (!id.ok) return;
    store.markInUse(id.value);

    const result = await archiveRole({ roleRepository: store.repository })(gerenteId);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-in-use');

    // Nao persistiu: o papel continua active.
    const reread = await store.repository.findById(id.value);
    assert.equal(reread.ok, true);
    if (!reread.ok || reread.value === null) return assert.fail('papel sumiu');
    assert.equal(reread.value.status, 'active');
  });

  it('id inexistente -> role-not-found', async () => {
    const { store } = await seedStore();
    const result = await archiveRole({ roleRepository: store.repository })(RoleId.generate());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-not-found');
  });

  it('id invalido (nao-UUID) -> role-id-invalid', async () => {
    const { store } = await seedStore();
    const result = await archiveRole({ roleRepository: store.repository })('nao-e-uuid');
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-id-invalid');
  });

  it('propaga o erro do repositorio (findById)', async () => {
    const failing: RoleRepository = {
      save: () => Promise.resolve(ok(undefined)),
      findById: () => Promise.resolve(err('role-repo-unavailable')),
      list: () => Promise.resolve(ok([])),
      isInUse: () => Promise.resolve(ok(false)),
    };
    const result = await archiveRole({ roleRepository: failing })(RoleId.generate());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-repo-unavailable');
  });

  it('propaga o erro do repositorio (isInUse)', async () => {
    const role = makeRole('gerente', ['role:read']);
    const failing: RoleRepository = {
      save: () => Promise.resolve(ok(undefined)),
      findById: () => Promise.resolve(ok(role)),
      list: () => Promise.resolve(ok([])),
      isInUse: () => Promise.resolve(err('role-repo-unavailable')),
    };
    const result = await archiveRole({ roleRepository: failing })(String(role.id));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-repo-unavailable');
  });

  it('propaga o erro do repositorio (save)', async () => {
    const role = makeRole('gerente', ['role:read']);
    const failing: RoleRepository = {
      save: () => Promise.resolve(err('role-repo-unavailable')),
      findById: () => Promise.resolve(ok(role)),
      list: () => Promise.resolve(ok([])),
      isInUse: () => Promise.resolve(ok(false)),
    };
    const result = await archiveRole({ roleRepository: failing })(String(role.id));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-repo-unavailable');
  });
});
