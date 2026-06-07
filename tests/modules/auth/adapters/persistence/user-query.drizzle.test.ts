/**
 * AUTH-DB-USER-QUERY — integração (Drizzle/MySQL) — gated MYSQL_INTEGRATION=1.
 *
 * Valida o adapter `createDrizzleUserQuery` (listagem paginada, US1) contra MySQL 8.4 real:
 * busca LIKE case-insensitive (COLLATE utf8mb4_unicode_ci), filtro de status, ORDER BY name
 * (índice auth_user_name_idx), COUNT(*) + LIMIT/OFFSET. Cobre a lacuna de integração da spec 005
 * (até então o read model só tinha cobertura in-memory).
 *
 * VALID_CONN: mesma string dos demais testes de integração auth. ASCII puro.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts';
import { createDrizzleUserQuery } from '#src/modules/auth/adapters/persistence/repos/user-query.drizzle.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import type { UserRepository } from '#src/modules/auth/domain/identity/user/repository.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const AT = new Date('2026-06-07T12:00:00.000Z');
const clock = ClockFixed(AT);

const mkUser = (email: string, name: string, disabled = false) => {
  const e = Email.parse(email);
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  let user: User.User = User.register(
    { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [] },
    AT,
  ).user;
  user = User.updateProfile(user, { name }, AT).user;
  if (disabled) user = User.disable(user as User.ActiveUser, AT).user;
  return user;
};

const seed = async (repo: UserRepository): Promise<void> => {
  const users = [
    mkUser('amanda@x.com', 'Amanda Souza'),
    mkUser('bruno@x.com', 'Bruno Lima'),
    mkUser('carlos@x.com', 'Carlos Dias', true),
  ];
  for (const u of users) {
    const saved = await repo.save(u);
    if (!saved.ok) throw new Error(`seed falhou: ${saved.error}`);
  }
};

if (integrationEnabled()) {
  let handle: AuthMysqlHandle | null = null;

  before(async () => {
    const r = await openAuthMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openAuthMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  beforeEach(async () => {
    if (handle === null) throw new Error('fixture: handle nao inicializado');
    await handle.db.delete(handle.schema.authUserRole);
    await handle.db.delete(handle.schema.authRefreshToken);
    await handle.db.delete(handle.schema.authUser);
    const { repository } = createDrizzleUserStore(handle, clock);
    await seed(repository);
  });

  describe('createDrizzleUserQuery — listagem contra MySQL', () => {
    it('CA1: lista todos ordenados por nome ASC; meta correta', async () => {
      const q = createDrizzleUserQuery(handle!);
      const r = await q.list({ page: 1, pageSize: 5, status: 'all' });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value.meta.totalItems, 3);
        assert.equal(r.value.meta.totalPages, 1);
        assert.deepEqual(
          r.value.items.map((u) => u.name),
          ['Amanda Souza', 'Bruno Lima', 'Carlos Dias'],
        );
      }
    });

    it('CA2: busca por nome e case-insensitive (LIKE CI)', async () => {
      const q = createDrizzleUserQuery(handle!);
      const r = await q.list({ page: 1, pageSize: 5, status: 'all', search: 'bruno' });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value.items.length, 1);
        assert.equal(r.value.items[0]?.email, 'bruno@x.com');
      }
    });

    it('CA3: filtro status=active exclui o desativado', async () => {
      const q = createDrizzleUserQuery(handle!);
      const r = await q.list({ page: 1, pageSize: 5, status: 'active' });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value.meta.totalItems, 2);
        assert.equal(
          r.value.items.every((u) => u.status === 'active'),
          true,
        );
      }
    });

    it('CA4: filtro status=disabled retorna so o desativado', async () => {
      const q = createDrizzleUserQuery(handle!);
      const r = await q.list({ page: 1, pageSize: 5, status: 'disabled' });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value.meta.totalItems, 1);
        assert.equal(r.value.items[0]?.name, 'Carlos Dias');
      }
    });

    it('CA5: paginacao com OFFSET (pageSize 2, page 2)', async () => {
      const q = createDrizzleUserQuery(handle!);
      const r = await q.list({ page: 2, pageSize: 2, status: 'all' });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value.meta.totalItems, 3);
        assert.equal(r.value.meta.totalPages, 2);
        assert.equal(r.value.items.length, 1);
        assert.equal(r.value.items[0]?.name, 'Carlos Dias');
      }
    });

    it('CA6: busca sem match retorna zero itens', async () => {
      const q = createDrizzleUserQuery(handle!);
      const r = await q.list({ page: 1, pageSize: 5, status: 'all', search: 'inexistente-zzz' });
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value.meta.totalItems, 0);
    });
  });
}
