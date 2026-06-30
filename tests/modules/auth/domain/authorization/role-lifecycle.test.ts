/**
 * W0 (RED) — AUTH-ROLE-LIFECYCLE-AGG — ciclo de vida do agregado Role.
 *
 * Ticket: AUTH-ROLE-LIFECYCLE-AGG (spec 006-gestao-acessos, Phase 2 Foundational, T005/T008).
 *
 * Estende o agregado Role com status (active/archived), RoleName, e as operacoes
 * rehydrate/rename/setPermissions(⊆catalogo)/archive(isInUse). Dominio puro (Result, sem throw).
 *
 * Cobre CA1..CA7 do 000-request. DEVEM FALHAR em W0 (operacoes ainda nao existem).
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';

const perm = (raw: string): Permission.Permission => {
  const r = Permission.parse(raw);
  if (!r.ok) throw new Error(`test setup: permissao invalida ${raw}`);
  return r.value;
};

const newRole = (name: string, perms: readonly string[]): Role.Role => {
  const r = Role.create({ id: RoleId.generate(), name, permissions: perms.map(perm) });
  if (!r.ok) throw new Error(`test setup: create falhou (${r.error})`);
  return r.value;
};

describe('Role.create — status inicial e nome', () => {
  it('CA1/CA2: create valido nasce com status active', () => {
    const r = Role.create({
      id: RoleId.generate(),
      name: 'Gestor de Contratos',
      permissions: [perm('contract:read')],
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.status, 'active');
      assert.equal(r.value.name, 'Gestor de Contratos');
    }
  });

  it('CA2: nome invalido (vazio) retorna err(role-name-invalid)', () => {
    const r = Role.create({ id: RoleId.generate(), name: '   ', permissions: [] });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'role-name-invalid');
  });
});

describe('Role.rehydrate — reconstrucao do banco', () => {
  it('CA3: reconstroi com status archived e permissoes do banco (sem revalidar catalogo)', () => {
    const r = Role.rehydrate({
      id: RoleId.generate(),
      name: 'Legado',
      // permissao fora do catalogo atual: o banco e a fonte; rehydrate nao rejeita.
      permissions: [perm('legacy:capability')],
      status: 'archived',
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.status, 'archived');
      assert.equal(r.value.permissions.includes(perm('legacy:capability')), true);
    }
  });
});

describe('Role.rename', () => {
  it('CA4: renomeia com nome normalizado', () => {
    const role = newRole('Antigo', ['contract:read']);
    const r = Role.rename(role, '  Novo   Nome  ');
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.name, 'Novo Nome');
      assert.equal(r.value.status, 'active');
    }
  });

  it('CA4: nome invalido retorna err(role-name-invalid)', () => {
    const role = newRole('Antigo', []);
    const r = Role.rename(role, '');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'role-name-invalid');
  });
});

describe('Role.setPermissions — validacao contra catalogo', () => {
  it('CA5: substitui por permissoes do catalogo (dedup)', () => {
    const role = newRole('Gestor', ['contract:read']);
    const r = Role.setPermissions(role, [
      perm('role:read'),
      perm('role:create'),
      perm('role:read'),
    ]);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.permissions.length, 2);
      assert.equal(r.value.permissions.includes(perm('role:read')), true);
    }
  });

  it('CA5: permissao fora do catalogo retorna err(role-permission-not-in-catalog)', () => {
    const role = newRole('Gestor', []);
    const r = Role.setPermissions(role, [perm('role:read'), perm('unknown:permission')]);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'role-permission-not-in-catalog');
  });
});

describe('Role.archive — ciclo de vida', () => {
  it('CA6: archive bloqueado quando em uso retorna err(role-in-use)', () => {
    const role = newRole('Em Uso', ['contract:read']);
    const r = Role.archive(role, true);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'role-in-use');
  });

  it('CA6: archive sem uso transiciona para archived', () => {
    const role = newRole('Sem Uso', []);
    const r = Role.archive(role, false);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.status, 'archived');
  });

  it('CA6: archive e idempotente (ja archived, sem uso, permanece archived)', () => {
    const role = newRole('X', []);
    const first = Role.archive(role, false);
    assert.equal(first.ok, true);
    if (first.ok) {
      const second = Role.archive(first.value, false);
      assert.equal(second.ok, true);
      if (second.ok) assert.equal(second.value.status, 'archived');
    }
  });
});
