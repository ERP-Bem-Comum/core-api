/**
 * Suite de contrato compartilhada para RoleRepository (modulo auth).
 * Parametrizada por factory; NAO executa direto. Setup sync-ou-async. ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type { RoleRepository } from '#src/modules/auth/domain/authorization/role-repository.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';

interface RoleRepoSetup {
  repository: RoleRepository;
  teardown?: () => Promise<void>;
}

export interface RoleRepoFactory {
  make: () => RoleRepoSetup | Promise<RoleRepoSetup>;
}

const perm = (raw: string): Permission.Permission => {
  const r = Permission.parse(raw);
  if (!r.ok) throw new Error('fixture perm');
  return r.value;
};

const buildRole = (name: string, permissions: readonly Permission.Permission[]): Role.Role => {
  const r = Role.create({ id: RoleId.generate(), name, permissions });
  if (!r.ok) throw new Error('fixture role');
  return r.value;
};

export const runRoleRepositoryContract = (label: string, factory: RoleRepoFactory): void => {
  describe(`RoleRepository contract — ${label}`, () => {
    let repository: RoleRepository;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repository = built.repository;
      teardown = built.teardown;
    });

    const cleanup = async (): Promise<void> => {
      if (teardown) await teardown();
    };

    it('CA1: save -> findById retorna o role', async () => {
      const role = buildRole('Admin', [perm('contract:delete')]);
      const saved = await repository.save(role);
      assert.equal(saved.ok, true);
      const found = await repository.findById(role.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.id, role.id);
      await cleanup();
    });

    it('CA2: findById inexistente retorna ok(null)', async () => {
      const found = await repository.findById(RoleId.generate());
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, null);
      await cleanup();
    });

    it('CA3: save de mesmo id faz upsert (permissao adicionada)', async () => {
      const role = buildRole('Gestor', [perm('contract:delete')]);
      await repository.save(role);
      const updated = Role.grant(role, perm('user:register'));
      await repository.save(updated);
      const found = await repository.findById(role.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.permissions.length, 2);
      await cleanup();
    });

    it('CA4: list retorna todos os roles salvos', async () => {
      await repository.save(buildRole('A', [perm('contract:delete')]));
      await repository.save(buildRole('B', [perm('user:register')]));
      const all = await repository.list();
      assert.equal(all.ok, true);
      if (all.ok) assert.equal(all.value.length, 2);
      await cleanup();
    });
  });
};
