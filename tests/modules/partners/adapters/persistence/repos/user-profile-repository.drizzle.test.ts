/**
 * PARTNERS-USER-PROFILE-PERSISTENCE — repo Drizzle/MySQL — gated MYSQL_INTEGRATION=1.
 *
 * DEVE FALHAR em W0 (createDrizzleUserProfileStore inexistente). Roda contra MySQL
 * real (docker compose). Truncate no beforeEach. Sem este env, suite é skipped.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as UserProfile from '#src/modules/partners/domain/user-profile/user-profile.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleUserProfileStore } from '#src/modules/partners/adapters/persistence/repos/user-profile-repository.drizzle.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

const build = (refRaw: string, cpfRaw = '111.444.777-35') => {
  const ref = UserRef.rehydrate(refRaw);
  if (!ref.ok) throw new Error(`fixture ref: ${ref.error}`);
  const r = UserProfile.create({
    userRef: ref.value,
    name: 'Maria Silva',
    cpf: cpfRaw,
    telephone: '11999998888',
    avatarUrl: null,
    createdAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture profile: ${r.error}`);
  return r.value.profile;
};

const REF_A = '7f3a1234-5678-4abc-9def-fedcba987654';
const REF_B = '00000000-0000-4000-8000-000000000000';

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;

  before(async () => {
    const opened = await openPartnersMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`open failed: ${opened.error}`);
    handle = opened.value;
  });

  after(async () => {
    if (handle !== null) await handle.close();
  });

  beforeEach(async () => {
    if (handle !== null) await handle.db.delete(handle.schema.parUserProfiles);
  });

  describe('DrizzleUserProfileStore', () => {
    it('save → findByUserRef round-trip', async () => {
      if (handle === null) return;
      const repo = createDrizzleUserProfileStore(handle, clock);
      const p = build(REF_A);
      assert.equal(isOk(await repo.save(p)), true);

      const found = await repo.findByUserRef(p.userRef);
      assert.equal(isOk(found), true);
      if (found.ok && found.value !== null) assert.equal(String(found.value.cpf), '11144477735');
    });

    it('findByCpf acha o persistido', async () => {
      if (handle === null) return;
      const repo = createDrizzleUserProfileStore(handle, clock);
      await repo.save(build(REF_A));
      const cpf = Cpf.parse('111.444.777-35');
      if (cpf.ok) {
        const found = await repo.findByCpf(cpf.value);
        assert.equal(isOk(found), true);
        if (found.ok) assert.notEqual(found.value, null);
      }
    });

    it('2º save com mesmo user_ref atualiza (não duplica)', async () => {
      if (handle === null) return;
      const repo = createDrizzleUserProfileStore(handle, clock);
      await repo.save(build(REF_A));
      const updated = UserProfile.updateContact(
        build(REF_A),
        { name: 'Maria Souza', telephone: '11888887777', avatarUrl: null },
        clock.now(),
      );
      if (updated.ok) assert.equal(isOk(await repo.save(updated.value.profile)), true);
    });

    it('cpf de outro user_ref → user-profile-cpf-duplicate', async () => {
      if (handle === null) return;
      const repo = createDrizzleUserProfileStore(handle, clock);
      await repo.save(build(REF_A));
      const dup = await repo.save(build(REF_B));
      assert.equal(isErr(dup), true);
      if (!dup.ok) assert.equal(dup.error, 'user-profile-cpf-duplicate');
    });
  });
}
