/**
 * AUTH-DB-REPO-ROLE (P2) — Drizzle/MySQL — gated MYSQL_INTEGRATION=1.
 *
 * CA5: roda a contract-suite (CA1-CA4) contra o adapter Drizzle.
 * CA6: dois roles compartilham a MESMA permission -> auth_permission criada uma vez (upsert por name);
 *      ambos reidratam a permission.
 *
 * DEVE FALHAR em W0 (createDrizzleRoleStore inexistente). VALID_CONN igual ao test do contracts/User.
 * Truncate em ordem FK no beforeEach. ASCII puro.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.drizzle.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';

import { runRoleRepositoryContract } from './role-repository.contract.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const fixedClock = ClockFixed(new Date('2026-05-27T12:00:00.000Z'));

const truncateAll = async (handle: AuthMysqlHandle): Promise<void> => {
  const { db, schema } = handle;
  await db.delete(schema.authUserRole);
  await db.delete(schema.authRolePermission);
  await db.delete(schema.authRefreshToken);
  await db.delete(schema.authUser);
  await db.delete(schema.authRole);
  await db.delete(schema.authPermission);
};

const perm = (raw: string): Permission.Permission => {
  const p = Permission.parse(raw);
  if (!p.ok) throw new Error('fixture permission');
  return p.value;
};

const buildRole = (name: string, permissions: readonly Permission.Permission[]): Role.Role => {
  const r = Role.create({ id: RoleId.generate(), name, permissions });
  if (!r.ok) throw new Error('fixture role');
  return r.value;
};

if (integrationEnabled()) {
  let handle: AuthMysqlHandle | null = null;

  before(async () => {
    const r = await openAuthMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openAuthMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) await handle.close();
  });

  beforeEach(async () => {
    if (handle !== null) await truncateAll(handle);
  });

  // CA5: contract-suite contra Drizzle
  runRoleRepositoryContract('Drizzle/MySQL', {
    make: () => {
      if (handle === null) throw new Error('handle nao inicializado');
      const store = createDrizzleRoleStore(handle, fixedClock);
      return { repository: store.repository };
    },
  });

  // CA6: permission compartilhada -> auth_permission criada uma vez
  describe('AUTH-DB-REPO-ROLE — CA6: reconciliacao de permission compartilhada', () => {
    it('CA6: dois roles com a mesma permission -> upsert idempotente por name', async () => {
      if (handle === null) throw new Error('handle');
      const store = createDrizzleRoleStore(handle, fixedClock);
      const shared = perm('contract:delete');

      const roleA = buildRole('A', [shared]);
      const roleB = buildRole('B', [shared]);
      assert.equal((await store.repository.save(roleA)).ok, true);
      assert.equal((await store.repository.save(roleB)).ok, true);

      // auth_permission deve ter UMA linha para 'contract:delete'
      const perms = await handle.db.select().from(handle.schema.authPermission);
      assert.equal(
        perms.filter((p) => p.name === 'contract:delete').length,
        1,
        'auth_permission nao deve duplicar a permission compartilhada',
      );

      // ambos os roles reidratam a permission
      const foundA = await store.repository.findById(roleA.id);
      const foundB = await store.repository.findById(roleB.id);
      assert.equal(foundA.ok && foundA.value?.permissions.includes(shared), true);
      assert.equal(foundB.ok && foundB.value?.permissions.includes(shared), true);
    });
  });
}
