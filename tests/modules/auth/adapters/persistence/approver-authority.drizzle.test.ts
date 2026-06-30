/**
 * W0 (RED) — FIN-APPROVER-LIMIT-AUTH (#289), CA6/CA7 (integracao Drizzle/MySQL).
 *
 * Autoridade efetiva de aprovacao lida via public-api do auth (consumida cross-modulo pelo
 * financial, ADR-0006). `getApproverAuthority(userId)` projeta { userId, canApprove, limitCents }:
 *   - canApprove = usuario tem >=1 papel com 'payable:approve';
 *   - limitCents = MAX(approval_limit_cents) entre os papeis aprovadores; null = sem alcada;
 *   - usuario inexistente -> ok(null).
 * `listApproversWithAuthority()` lista os aprovadores (payable:approve) com a alcada efetiva.
 *
 * DEVE FALHAR em W0 — getApproverAuthority/listApproversWithAuthority inexistentes no read store
 * e Role.approvalLimit/approvalLimitCents ainda nao existem.
 *
 * GATE: so roda com MYSQL_INTEGRATION=1 (manifesto suite 'auth' em scripts/ci/test-integration.ts).
 * ASCII puro.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.drizzle.ts';
import { createDrizzleUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts';
import { createDrizzleUserReadStore } from '#src/modules/auth/adapters/persistence/repos/user-read.drizzle.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const clock = ClockFixed(new Date('2026-06-30T12:00:00.000Z'));

const perm = (raw: string): Permission.Permission => {
  const p = Permission.parse(raw);
  if (!p.ok) throw new Error('fixture permission');
  return p.value;
};

const APPROVE = (): Permission.Permission => perm('payable:approve');

const buildRole = (
  name: string,
  permissions: readonly Permission.Permission[],
  approvalLimitCents: number | null,
): Role.Role => {
  const r = Role.create({ id: RoleId.generate(), name, permissions, approvalLimitCents });
  if (!r.ok) throw new Error(`fixture role: ${r.error}`);
  return r.value;
};

const mkUser = (email: string, roles: readonly Role.Role[]) => {
  const e = Email.parse(email);
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('fixture user');
  return User.register(
    { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [...roles] },
    new Date('2026-06-30T12:00:00.000Z'),
  ).user;
};

// Ids estaveis das fixtures (capturados no seed).
const ids = {
  manager: '',
  director: '',
  operator: '',
  approverNoLimit: '',
};

if (!integrationEnabled()) {
  process.stdout.write('[auth:approver-authority] MYSQL_INTEGRATION != 1 — pulando integracao.\n');
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
    const { db, schema } = handle;
    await db.delete(schema.authUserRole);
    await db.delete(schema.authRolePermission);
    await db.delete(schema.authRefreshToken);
    await db.delete(schema.authUser);
    await db.delete(schema.authRole);
    await db.delete(schema.authPermission);

    const roleStore = createDrizzleRoleStore(handle, clock);
    const userStore = createDrizzleUserStore(handle, clock);

    // Papeis: aprovador com alcada (Gerente 100000 / Diretor 300000), aprovador sem alcada
    // (null) e nao-aprovador (sem payable:approve).
    const manager = buildRole('Gerente', [APPROVE()], 100000);
    const director = buildRole('Diretor', [APPROVE()], 300000);
    const approverNoLimit = buildRole('Aprovador Sem Alcada', [APPROVE()], null);
    const operator = buildRole('Operador', [perm('contract:delete')], null);
    for (const role of [manager, director, approverNoLimit, operator]) {
      const saved = await roleStore.repository.save(role);
      if (!saved.ok) throw new Error(`seed role: ${saved.error}`);
    }

    // Usuarios: u1 so Gerente; u2 Gerente+Diretor (MAX); u3 so Operador; u4 Aprovador sem alcada.
    const u1 = mkUser('u1@x.com', [manager]);
    const u2 = mkUser('u2@x.com', [manager, director]);
    const u3 = mkUser('u3@x.com', [operator]);
    const u4 = mkUser('u4@x.com', [approverNoLimit]);
    for (const u of [u1, u2, u3, u4]) {
      const saved = await userStore.repository.save(u);
      if (!saved.ok) throw new Error(`seed user: ${saved.error}`);
    }
    ids.manager = String(u1.id);
    ids.director = String(u2.id);
    ids.operator = String(u3.id);
    ids.approverNoLimit = String(u4.id);
  });

  describe('createDrizzleUserReadStore.getApproverAuthority — MySQL real (CA6)', () => {
    it('CA6a: papel aprovador com alcada -> canApprove + limitCents', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.getApproverAuthority(ids.manager);
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.notEqual(r.value, null);
        assert.equal(r.value?.canApprove, true);
        assert.equal(r.value?.limitCents, 100000);
      }
    });

    it('CA6b: multiplos papeis aprovadores -> limitCents = MAX', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.getApproverAuthority(ids.director);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value?.limitCents, 300000);
    });

    it('CA6c: usuario sem payable:approve -> canApprove false, limitCents null', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.getApproverAuthority(ids.operator);
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value?.canApprove, false);
        assert.equal(r.value?.limitCents, null);
      }
    });

    it('CA6d: aprovador sem alcada definida -> canApprove true, limitCents null', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.getApproverAuthority(ids.approverNoLimit);
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value?.canApprove, true);
        assert.equal(r.value?.limitCents, null);
      }
    });

    it('CA6e: usuario inexistente -> ok(null)', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.getApproverAuthority('00000000-0000-4000-8000-000000000000');
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, null);
    });
  });

  describe('createDrizzleUserReadStore.listApproversWithAuthority — MySQL real (CA7)', () => {
    it('CA7: lista apenas usuarios com payable:approve + alcada efetiva', async () => {
      const store = createDrizzleUserReadStore(handle!);
      const r = await store.listApproversWithAuthority();
      assert.equal(r.ok, true);
      if (r.ok) {
        const byId = new Map(r.value.map((a) => [a.userId, a]));
        assert.equal(byId.size, 3); // manager, director, approverNoLimit (operator fora)
        assert.equal(byId.get(ids.manager)?.limitCents, 100000);
        assert.equal(byId.get(ids.director)?.limitCents, 300000);
        assert.equal(byId.get(ids.approverNoLimit)?.limitCents, null);
        assert.equal(byId.has(ids.operator), false);
      }
    });
  });
}
