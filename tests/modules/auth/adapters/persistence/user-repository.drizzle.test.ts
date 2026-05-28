/**
 * AUTH-DB-REPO-USER — W1b (Drizzle/MySQL) — gated MYSQL_INTEGRATION=1.
 *
 * CA7: roda a contract-suite (CA1-CA6) contra o adapter Drizzle.
 * CA8: fixture SQL (auth_role + auth_permission + auth_role_permission); salva User
 *      com esse role; findById reidrata roles[] com permissions[].
 * CA9: salvar User com roleId inexistente em auth_role -> erro (violacao FK auth_urt_role_fk).
 *
 * VALID_CONN: mesma string que o test do contracts (mysql://root:rootpw-migration-test-only@...).
 * Truncate em ordem FK no beforeEach (auth_user_role -> auth_role_permission ->
 * auth_refresh_token -> auth_user -> auth_role -> auth_permission).
 * ASCII puro.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';

import { runUserRepositoryContract } from './user-repository.contract.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

// Clock fixo para testes (injetado no factory do store).
const FIXED_NOW = new Date('2026-05-27T12:00:00.000Z');
const fixedClock = ClockFixed(FIXED_NOW);

// ─── Truncate em ordem FK ─────────────────────────────────────────────────────
// Filhas antes das pais. FK chain:
//   auth_user_role    -> auth_user, auth_role
//   auth_role_permission -> auth_role, auth_permission
//   auth_refresh_token -> auth_user
//   auth_user
//   auth_role
//   auth_permission
const truncateAll = async (handle: AuthMysqlHandle): Promise<void> => {
  const { db, schema } = handle;
  // Filhas primeiro
  await db.delete(schema.authUserRole);
  await db.delete(schema.authRolePermission);
  await db.delete(schema.authRefreshToken);
  // Pais
  await db.delete(schema.authUser);
  await db.delete(schema.authRole);
  await db.delete(schema.authPermission);
};

if (integrationEnabled()) {
  let handle: AuthMysqlHandle | null = null;

  before(async () => {
    const r = await openAuthMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) {
      throw new Error(`fixture: openAuthMysql falhou — ${r.error}`);
    }
    handle = r.value;
  });

  // CRITICO: sem este after o pool mysql2 mantem conexoes abertas e o processo nao termina.
  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  // CA7 — Suite contratual (CA1-CA6) contra o adapter Drizzle.
  // Cada make() trunca as tabelas para isolar o cenario.
  runUserRepositoryContract('Drizzle/MySQL (truncated)', {
    make: async () => {
      if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');
      await truncateAll(handle);
      const { repository, reader } = createDrizzleUserStore(handle, fixedClock);
      return {
        repository,
        reader,
        teardown: async () => {
          // Sem teardown especifico — truncateAll roda no proximo beforeEach.
        },
      };
    },
  });

  // ─── CA8 + CA9 — Especificos do Drizzle ─────────────────────────────────────

  describe('AUTH-DB-REPO-USER — CA8/CA9: Drizzle especifico', () => {
    beforeEach(async () => {
      if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');
      await truncateAll(handle);
    });

    it('CA8: findById reidrata roles[] com permissions[]', async () => {
      if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');

      const { db, schema } = handle;
      const { repository, reader } = createDrizzleUserStore(handle, fixedClock);

      // Fixture: criar auth_permission, auth_role, auth_role_permission via SQL direto.
      const permId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
      const roleId = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

      await db.insert(schema.authPermission).values({
        id: permId,
        name: 'contract:read',
        createdAt: FIXED_NOW,
      });

      await db.insert(schema.authRole).values({
        id: roleId,
        name: 'operator',
        description: 'Operador do sistema',
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      });

      await db.insert(schema.authRolePermission).values({
        roleId,
        permissionId: permId,
      });

      // Criar User com esse role via domain + save.
      const emailR = Email.parse('ca8@example.com');
      const hashR = PasswordHash.fromString('$argon2id$ca8');
      const roleIdBrandedR = RoleId.rehydrate(roleId);
      const permR = Permission.parse('contract:read');
      assert.ok(emailR.ok && hashR.ok && roleIdBrandedR.ok && permR.ok, 'fixture VOs invalidos');
      if (!emailR.ok || !hashR.ok || !roleIdBrandedR.ok || !permR.ok) return;

      const roleR = Role.create({
        id: roleIdBrandedR.value,
        name: 'operator',
        permissions: [permR.value],
      });
      assert.ok(roleR.ok, 'Role.create falhou');
      if (!roleR.ok) return;

      const { user } = User.register(
        {
          id: UserId.generate(),
          email: emailR.value,
          passwordHash: hashR.value,
          roles: [roleR.value],
        },
        FIXED_NOW,
      );

      const savedR = await repository.save(user);
      assert.ok(savedR.ok, `save falhou: ${!savedR.ok ? savedR.error : ''}`);

      // findById deve reidratar roles[] com permissions[].
      const foundR = await reader.findById(user.id);
      assert.ok(foundR.ok, `findById falhou: ${!foundR.ok ? foundR.error : ''}`);
      if (!foundR.ok || foundR.value === null) {
        assert.fail('findById retornou null — usuario nao encontrado');
        return;
      }

      const found = foundR.value;
      assert.equal(found.id, user.id, 'id do usuario diverge');
      assert.equal(found.roles.length, 1, 'deve ter exatamente 1 role');

      const foundRole = found.roles[0];
      assert.ok(foundRole !== undefined, 'role[0] ausente');
      if (foundRole === undefined) return;

      assert.equal(foundRole.id, roleId, 'role id diverge');
      assert.equal(foundRole.name, 'operator', 'role name diverge');
      assert.equal(foundRole.permissions.length, 1, 'deve ter exatamente 1 permission');

      const foundPerm = foundRole.permissions[0];
      assert.ok(foundPerm !== undefined, 'permission[0] ausente');
      if (foundPerm === undefined) return;
      assert.equal(foundPerm as string, 'contract:read', 'permission diverge');
    });

    it('CA9: save com roleId inexistente -> erro (violacao FK auth_urt_role_fk)', async () => {
      if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');

      const { repository } = createDrizzleUserStore(handle, fixedClock);

      // RoleId valido como UUID v4 mas que NAO existe em auth_role.
      const fakeRoleId = RoleId.generate();
      const fakePermR = Permission.parse('contract:write');
      assert.ok(fakePermR.ok, 'fixture permission invalida');
      if (!fakePermR.ok) return;

      const fakeRoleR = Role.create({
        id: fakeRoleId,
        name: 'ghost-role',
        permissions: [fakePermR.value],
      });
      assert.ok(fakeRoleR.ok, 'Role.create falhou');
      if (!fakeRoleR.ok) return;

      const emailR = Email.parse('ca9@example.com');
      const hashR = PasswordHash.fromString('$argon2id$ca9');
      assert.ok(emailR.ok && hashR.ok, 'fixture VOs invalidos');
      if (!emailR.ok || !hashR.ok) return;

      const { user } = User.register(
        {
          id: UserId.generate(),
          email: emailR.value,
          passwordHash: hashR.value,
          roles: [fakeRoleR.value],
        },
        FIXED_NOW,
      );

      const savedR = await repository.save(user);
      // FK auth_urt_role_fk -> auth_role.id RESTRICT: errno 1452 (ER_NO_REFERENCED_ROW_2)
      // Nao e ER_DUP_ENTRY, entao cai em user-repo-unavailable.
      assert.equal(savedR.ok, false, 'save com roleId inexistente deveria falhar');
      if (!savedR.ok) {
        assert.equal(savedR.error, 'user-repo-unavailable', 'erro esperado: user-repo-unavailable');
      }
    });
  });
}
