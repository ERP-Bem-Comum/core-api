/**
 * CTR-AUTH-MYSQL-INTEGRATION-VALIDATE — integração MySQL dos repos Drizzle novos (BE-REC-001/003).
 * Gated por MYSQL_INTEGRATION=1. Exercita save/find reais de password reset token + account lockout
 * (schema auth_password_reset / auth_login_lockout + migrations 0001/0002). ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts';
import { createDrizzlePasswordResetTokenStore } from '#src/modules/auth/adapters/persistence/repos/password-reset-token-repository.drizzle.ts';
import { createDrizzleLoginLockoutStore } from '#src/modules/auth/adapters/persistence/repos/login-lockout-store.drizzle.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as ResetToken from '#src/modules/auth/domain/session/password-reset-token.ts';
import * as ResetTokenId from '#src/modules/auth/domain/session/password-reset-token-id.ts';
import * as AccountLockout from '#src/modules/auth/domain/session/account-lockout.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const NOW = new Date('2026-05-30T12:00:00.000Z');
const POLICY = { threshold: 5, stepsMinutes: [1, 5, 15, 60] } as const;

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

  const seedUser = async (h: AuthMysqlHandle): Promise<UserId.UserId> => {
    await h.db.delete(h.schema.authPasswordReset);
    await h.db.delete(h.schema.authLoginLockout);
    await h.db.delete(h.schema.authUserRole);
    await h.db.delete(h.schema.authRefreshToken);
    await h.db.delete(h.schema.authUser);

    const email = Email.parse('reset-int@example.com');
    if (!email.ok) throw new Error('seed email');
    const ph = PasswordHash.fromString('fake-sha256:seed');
    if (!ph.ok) throw new Error('seed hash');
    const { user } = User.register(
      { id: UserId.generate(), email: email.value, passwordHash: ph.value, roles: [] },
      NOW,
    );
    const { repository } = createDrizzleUserStore(h, ClockFixed(NOW));
    const saved = await repository.save(user);
    if (!saved.ok) throw new Error('seed user save');
    return user.id;
  };

  describe('Integração MySQL — password reset token + account lockout', () => {
    it('reset token: save -> findByTokenHash + findUnusedByUserId', async () => {
      if (handle === null) throw new Error('handle');
      const userId = await seedUser(handle);
      const { repository } = createDrizzlePasswordResetTokenStore(handle);

      const tok = ResetToken.issue({
        id: ResetTokenId.generate(),
        userId,
        tokenHash: 'sha256:integration-A',
        requestedAt: NOW,
        expiresAt: new Date(NOW.getTime() + 900_000),
      });
      if (!tok.ok) throw new Error('issue');

      assert.equal((await repository.save(tok.value)).ok, true);

      const found = await repository.findByTokenHash('sha256:integration-A');
      assert.equal(found.ok, true);
      if (found.ok) assert.notEqual(found.value, null);

      const unused = await repository.findUnusedByUserId(userId);
      assert.equal(unused.ok, true);
      if (unused.ok) assert.equal(unused.value.length, 1);
    });

    it('lockout: save (upsert por user_id) -> findByUserId', async () => {
      if (handle === null) throw new Error('handle');
      const userId = await seedUser(handle);
      const { repository } = createDrizzleLoginLockoutStore(handle);

      const first = AccountLockout.registerFailure(AccountLockout.initial(userId), NOW, POLICY);
      assert.equal((await repository.save(first)).ok, true);

      const got = await repository.findByUserId(userId);
      assert.equal(got.ok, true);
      if (got.ok && got.value !== null) assert.equal(got.value.failedAttempts, 1);

      // upsert: nova falha sobrescreve a mesma linha (PK = user_id)
      const second = AccountLockout.registerFailure(first, NOW, POLICY);
      assert.equal((await repository.save(second)).ok, true);

      const got2 = await repository.findByUserId(userId);
      assert.equal(got2.ok, true);
      if (got2.ok && got2.value !== null) assert.equal(got2.value.failedAttempts, 2);
    });
  });
}
