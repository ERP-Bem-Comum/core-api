/**
 * W0 (RED) - AUTH-UPDATE-ROLE: use case updateRole (US6 da spec 006).
 *
 * DEVE FALHAR em W0 - o use case update-role.ts ainda nao existe.
 * Edita um papel existente (patch parcial): renomeia e/ou substitui permissions. Valida nome
 * (RoleName) + permissions (catalogo) via dominio, checa unicidade de nome via repo.list()
 * excluindo o proprio role (mesmo id nao conta como duplicata) e persiste. Usa o adapter
 * InMemory real de RoleRepository. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { updateRole } from '#src/modules/auth/application/use-cases/update-role.ts';
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

/** Store in-memory com 2 roles semeados; devolve os ids para os testes referenciarem. */
const seedStore = async (): Promise<{
  store: ReturnType<typeof makeInMemoryRoleStore>;
  gerenteId: string;
  auditorId: string;
}> => {
  const store = makeInMemoryRoleStore();
  const gerente = makeRole('gerente', ['role:read', 'user:list']);
  const auditor = makeRole('auditor', ['role:read']);
  await store.repository.save(gerente);
  await store.repository.save(auditor);
  return { store, gerenteId: String(gerente.id), auditorId: String(auditor.id) };
};

describe('AUTH-UPDATE-ROLE — updateRole', () => {
  it('renomeia o papel (ok; persiste o novo nome)', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      name: 'gerente-de-acessos',
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.name), 'gerente-de-acessos');
    assert.equal(String(result.value.id), gerenteId);

    const reread = await store.repository.findById(result.value.id);
    assert.equal(reread.ok, true);
    if (!reread.ok || reread.value === null) return assert.fail('papel sumiu');
    assert.equal(String(reread.value.name), 'gerente-de-acessos');
  });

  it('substitui as permissions (ok; ⊆ catalogo)', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      permissions: ['role:read', 'role:create'],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual([...result.value.permissions].map(String).sort(), [
      'role:create',
      'role:read',
    ]);
    // Nome inalterado no patch so-permissions.
    assert.equal(String(result.value.name), 'gerente');
  });

  it('patch so name nao mexe nas permissions', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      name: 'gestor',
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.name), 'gestor');
    assert.deepEqual([...result.value.permissions].map(String).sort(), ['role:read', 'user:list']);
  });

  it('patch so permissions nao mexe no nome', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      permissions: ['user:list'],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.name), 'gerente');
    assert.deepEqual([...result.value.permissions].map(String), ['user:list']);
  });

  it('renomear para o nome de OUTRO papel -> role-name-duplicate (sem save)', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      name: '  auditor  ', // normaliza para 'auditor', que pertence a outro role
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-name-duplicate');

    // Nao persistiu: o gerente continua com o nome original.
    const all = await store.repository.list();
    assert.equal(all.ok, true);
    if (!all.ok) return;
    const gerente = all.value.find((r) => String(r.id) === gerenteId);
    assert.ok(gerente);
    assert.equal(String(gerente.name), 'gerente');
  });

  it('renomear para o PROPRIO nome atual e ok (mesmo id nao conta como duplicata)', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      name: '  gerente  ', // normaliza para 'gerente' (o nome dele mesmo)
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.name), 'gerente');
  });

  it('permissao fora do catalogo -> role-permission-not-in-catalog', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      permissions: ['nonexistent:permission'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-permission-not-in-catalog');
  });

  it('permissao com formato invalido -> role-permission-not-in-catalog', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      permissions: ['naoTemDoisPontos'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-permission-not-in-catalog');
  });

  it('nome vazio -> role-name-invalid', async () => {
    const { store, gerenteId } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: gerenteId,
      name: '   ',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-name-invalid');
  });

  it('id inexistente -> role-not-found', async () => {
    const { store } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: RoleId.generate(),
      name: 'qualquer',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-not-found');
  });

  it('id invalido (nao-UUID) -> role-id-invalid', async () => {
    const { store } = await seedStore();
    const result = await updateRole({ roleRepository: store.repository })({
      id: 'nao-e-uuid',
      name: 'qualquer',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-id-invalid');
  });

  it('propaga o erro do repositorio (findById)', async () => {
    const failing: RoleRepository = {
      save: () => Promise.resolve(ok(undefined)),
      findById: () => Promise.resolve(err('role-repo-unavailable')),
      list: () => Promise.resolve(ok([])),
      isInUse: () => Promise.resolve(err('role-repo-unavailable')),
    };
    const result = await updateRole({ roleRepository: failing })({
      id: RoleId.generate(),
      name: 'qualquer',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'role-repo-unavailable');
  });
});
