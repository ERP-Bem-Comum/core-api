/**
 * FIN-RECON-EXECUTOR-NAME (#207) — CA5 (integração): AuthUserReadPort.getUserName (Drizzle/MySQL).
 *
 * Read port read-only do nome de usuário, consumido cross-módulo (financial, ADR-0006/0032) para
 * compor `reconciledByName`/`closedByName` sem `user:read`. Valida contra MySQL 8.4 real:
 *   - id existente com nome → ok({ id, name });
 *   - id existente sem nome (auth_user.name nullable) → ok({ id, name: null });
 *   - id inexistente → ok(null).
 *
 * GATE: só roda com `MYSQL_INTEGRATION=1` (ver package.json §test:integration:auth). Sem o gate,
 * o arquivo apenas registra o skip e não toca Docker/MySQL.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts';
import { createDrizzleUserReadStore } from '#src/modules/auth/adapters/persistence/repos/user-read.drizzle.ts';
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

const NAMED_ID = UserId.generate();
const UNNAMED_ID = UserId.generate();

const mkUser = (id: User.User['id'], email: string, name: string | null) => {
  const e = Email.parse(email);
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  let user: User.User = User.register(
    { id, email: e.value, passwordHash: h.value, roles: [] },
    AT,
  ).user;
  if (name !== null) user = User.updateProfile(user, { name }, AT).user;
  return user;
};

const seed = async (repo: UserRepository): Promise<void> => {
  const named = await repo.save(mkUser(NAMED_ID, 'named@x.com', 'João Conciliador'));
  if (!named.ok) throw new Error(`seed named: ${named.error}`);
  const unnamed = await repo.save(mkUser(UNNAMED_ID, 'unnamed@x.com', null));
  if (!unnamed.ok) throw new Error(`seed unnamed: ${unnamed.error}`);
};

if (!integrationEnabled()) {
  process.stdout.write('[auth:user-read] MYSQL_INTEGRATION != 1 — pulando integração.\n');
} else {
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

  describe('createDrizzleUserReadStore.getUserName — MySQL real (CA5)', () => {
    it('id existente com nome → ok({ id, name })', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.getUserName(String(NAMED_ID));
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.notEqual(r.value, null);
        assert.equal(r.value?.id, String(NAMED_ID));
        assert.equal(r.value?.name, 'João Conciliador');
      }
    });

    it('id existente sem nome → ok({ id, name: null })', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.getUserName(String(UNNAMED_ID));
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.notEqual(r.value, null);
        assert.equal(r.value?.id, String(UNNAMED_ID));
        assert.equal(r.value?.name, null);
      }
    });

    it('id inexistente → ok(null)', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.getUserName('00000000-0000-4000-8000-000000000000');
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, null);
    });
  });
}
