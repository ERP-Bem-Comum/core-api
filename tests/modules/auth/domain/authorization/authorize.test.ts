/**
 * W0 (RED) - Tests para o servico authorize do modulo auth.
 *
 * Ticket: AUTH-AGG-USER. Decisao DD-USER-02: funcao pura, fail-closed (default deny),
 * recebe ActiveUser, reusa Role.hasPermission varrendo user.roles.
 *
 * Cobre CA9..CA10. DEVEM FALHAR em W0 - authorize.ts nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Authorize from '#src/modules/auth/domain/authorization/authorize.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');

const perm = (raw: string): Permission.Permission => {
  const r = Permission.parse(raw);
  if (!r.ok) throw new Error('setup perm');
  return r.value;
};

const activeWith = (permissions: readonly Permission.Permission[]): User.ActiveUser => {
  const roleR = Role.create({ id: RoleId.generate(), name: 'Role', permissions });
  if (!roleR.ok) throw new Error('setup role');
  const emailR = Email.parse('user@example.com');
  const hashR = PasswordHash.fromString('$argon2id$x');
  if (!emailR.ok || !hashR.ok) throw new Error('setup vo');
  const { user } = User.register(
    { id: UserId.generate(), email: emailR.value, passwordHash: hashR.value, roles: [roleR.value] },
    AT,
  );
  return user;
};

describe('authorize', () => {
  it('CA9: usuario com a permissao retorna ok', () => {
    const user = activeWith([perm('contract:delete')]);
    const r = Authorize.authorize(user, perm('contract:delete'));
    assert.equal(r.ok, true);
  });

  it('CA10: usuario sem a permissao retorna err forbidden (fail-closed)', () => {
    const user = activeWith([perm('contract:delete')]);
    const r = Authorize.authorize(user, perm('user:register'));
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'forbidden');
    }
  });
});
