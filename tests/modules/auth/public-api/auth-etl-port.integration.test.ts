import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { eq } from 'drizzle-orm';

import { buildAuthEtlPort } from '#src/modules/auth/public-api/etl.ts';
import {
  openAuthMysql,
  type AuthMysqlHandle,
} from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const emailOf = (raw: string): Email.Email => {
  const r = Email.parse(raw);
  if (!r.ok) throw new Error(`fixture email inválido: ${r.error}`);
  return r.value;
};

type ProvisionInput = Readonly<{ legacyId: number; email: Email.Email; massApprove: boolean }>;
type ProvisionResult =
  | { ok: true; value: { userRef: string; outcome: 'created' | 'already-exists' } }
  | { ok: false; error: string };
type ProvisionFn = (input: ProvisionInput) => Promise<ProvisionResult>;

if (integrationEnabled()) {
  let handle: AuthMysqlHandle | null = null;
  let closePort: (() => Promise<void>) | null = null;
  let provision: ProvisionFn | null = null;

  before(async () => {
    const opened = await openAuthMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`fixture: openAuthMysql falhou — ${opened.error}`);
    handle = opened.value;

    const built = await buildAuthEtlPort({ connectionString: VALID_CONN });
    if (!built.ok) throw new Error(`fixture: buildAuthEtlPort falhou — ${built.error}`);
    provision = built.value.provisionLegacyUser;
    closePort = built.value.close;
  });

  after(async () => {
    if (closePort !== null) await closePort();
    if (handle !== null) await handle.close();
    handle = null;
  });

  beforeEach(async () => {
    if (handle === null) return;
    await handle.db.delete(handle.schema.authUserRole);
    await handle.db.delete(handle.schema.authRolePermission);
    await handle.db.delete(handle.schema.authUser);
    await handle.db.delete(handle.schema.authRole);
    await handle.db.delete(handle.schema.authPermission);
  });

  describe('buildAuthEtlPort (integração)', () => {
    it('é idempotente por legacy_id: 2× provision = 1 linha em auth_user', async () => {
      if (handle === null || provision === null) return;

      const first = await provision({
        legacyId: 7,
        email: emailOf('j7@example.com'),
        massApprove: false,
      });
      assert.equal(first.ok, true);
      if (!first.ok) return;
      assert.equal(first.value.outcome, 'created');

      const again = await provision({
        legacyId: 7,
        email: emailOf('j7@example.com'),
        massApprove: false,
      });
      assert.equal(again.ok, true);
      if (!again.ok) return;
      assert.equal(again.value.outcome, 'already-exists');
      assert.equal(again.value.userRef, first.value.userRef);

      const rows = await handle.db
        .select({ id: handle.schema.authUser.id })
        .from(handle.schema.authUser)
        .where(eq(handle.schema.authUser.legacyId, 7));
      assert.equal(rows.length, 1);
    });

    it('massApprove=true cria/reusa um único Role etl:mass-approver entre users', async () => {
      if (handle === null || provision === null) return;

      await provision({ legacyId: 1, email: emailOf('a@example.com'), massApprove: true });
      await provision({ legacyId: 2, email: emailOf('b@example.com'), massApprove: true });

      const roles = await handle.db
        .select({ id: handle.schema.authRole.id })
        .from(handle.schema.authRole)
        .where(eq(handle.schema.authRole.name, 'etl:mass-approver'));
      assert.equal(roles.length, 1);
    });

    it('fail-closed: o user nasce com hash argon2 real (login impossível até reset)', async () => {
      if (handle === null || provision === null) return;

      await provision({ legacyId: 5, email: emailOf('locked@example.com'), massApprove: false });

      const { reader } = createDrizzleUserStore(handle, ClockReal());
      const found = await reader.findByEmail(emailOf('locked@example.com'));
      assert.equal(found.ok, true);
      if (!found.ok || found.value === null) return;
      assert.equal(String(found.value.passwordHash).startsWith('$argon2'), true);
    });
  });
}
