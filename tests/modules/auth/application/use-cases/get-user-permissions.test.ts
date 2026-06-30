/**
 * W0 (RED) - Tests para o use case getUserPermissions (modulo auth, US1 da spec 006).
 *
 * Ticket: AUTH-GET-USER-PERMISSIONS. Cobre:
 *   - uniao das permissoes de multiplas roles, deduplicada
 *   - inclui contract:mass-approve quando presente
 *   - id sem formato valido -> err('user-id-invalid')
 *   - id valido inexistente -> err('user-not-found')
 *   - usuario disabled ainda retorna as permissoes (active OU disabled)
 *
 * DEVE FALHAR em W0 - get-user-permissions.ts ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { getUserPermissions } from '#src/modules/auth/application/use-cases/get-user-permissions.ts';
import type { UserReader } from '#src/modules/auth/domain/identity/user/repository.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import * as UserAgg from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';

const AT = new Date('2026-06-08T12:00:00.000Z');

const roleWith = (name: string, perms: readonly string[]): Role.Role => {
  const permissions = perms.map((p) => {
    const parsed = Permission.parse(p);
    if (!parsed.ok) throw new Error(`setup perm ${p}`);
    return parsed.value;
  });
  const r = Role.create({ id: RoleId.generate(), name, permissions });
  if (!r.ok) throw new Error('setup role');
  return r.value;
};

const mkUser = (opts: { email: string; roles: readonly Role.Role[]; disabled?: boolean }): User => {
  const e = Email.parse(opts.email);
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  let user: User = UserAgg.register(
    {
      id: UserId.generate(),
      email: e.value,
      passwordHash: h.value,
      roles: opts.roles,
    },
    AT,
  ).user;
  if (opts.disabled) user = UserAgg.disable(user as UserAgg.ActiveUser, AT).user;
  return user;
};

const reader = (users: readonly User[]): UserReader => ({
  findById: (id) => Promise.resolve(ok(users.find((u) => u.id === id) ?? null)),
  findByEmail: () => Promise.resolve(ok(null)),
});

describe('getUserPermissions', () => {
  it('retorna a uniao das permissoes de multiplas roles, deduplicada', async () => {
    const u = mkUser({
      email: 'multi@x.com',
      roles: [roleWith('A', ['user:read', 'user:list']), roleWith('B', ['user:list', 'role:read'])],
    });
    const r = await getUserPermissions({ userReader: reader([u]) })(String(u.id));

    assert.equal(r.ok, true);
    if (r.ok) {
      const perms = [...r.value].sort();
      assert.deepEqual(perms, ['role:read', 'user:list', 'user:read']);
    }
  });

  it('inclui contract:mass-approve quando presente', async () => {
    const u = mkUser({
      email: 'approver@x.com',
      roles: [roleWith('Aprovador', ['contract:mass-approve'])],
    });
    const r = await getUserPermissions({ userReader: reader([u]) })(String(u.id));
    assert.equal(r.ok && r.value.includes('contract:mass-approve'), true);
  });

  it('id sem formato valido retorna err user-id-invalid', async () => {
    const r = await getUserPermissions({ userReader: reader([]) })('nao-e-uuid');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-id-invalid');
  });

  it('id valido inexistente retorna err user-not-found', async () => {
    const r = await getUserPermissions({ userReader: reader([]) })(String(UserId.generate()));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-not-found');
  });

  it('usuario disabled ainda retorna as permissoes', async () => {
    const u = mkUser({
      email: 'off@x.com',
      roles: [roleWith('A', ['role:read'])],
      disabled: true,
    });
    const r = await getUserPermissions({ userReader: reader([u]) })(String(u.id));
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual([...r.value], ['role:read']);
  });
});
