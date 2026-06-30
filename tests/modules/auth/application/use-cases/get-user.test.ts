/**
 * W0 (RED) - Tests para o use case getUser (modulo auth, US2 da spec 005).
 *
 * Ticket: AUTH-GET-USER. Cobre CA1..CA5 (use case):
 *   CA1: id existente -> ok(UserDetail) com campos de perfil
 *   CA2: id sem formato valido -> err('user-id-invalid')
 *   CA3: id valido inexistente -> err('user-not-found')
 *   CA4: role com contract:mass-approve -> massApprovalPermission=true; sem -> false
 *   CA5: usuario disabled -> active=false
 *
 * DEVE FALHAR em W0 - get-user.ts ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { getUser } from '#src/modules/auth/application/use-cases/get-user.ts';
import type { UserReader } from '#src/modules/auth/domain/identity/user/repository.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import * as UserAgg from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as Cpf from '#src/modules/auth/domain/identity/cpf.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';

const AT = new Date('2026-06-07T12:00:00.000Z');

const massApproveRole = (): Role.Role => {
  const perm = Permission.parse('contract:mass-approve');
  if (!perm.ok) throw new Error('setup perm');
  const r = Role.create({ id: RoleId.generate(), name: 'Aprovador', permissions: [perm.value] });
  if (!r.ok) throw new Error('setup role');
  return r.value;
};

const mkUser = (opts: {
  email: string;
  name: string;
  cpf?: string;
  disabled?: boolean;
  massApprove?: boolean;
}): User => {
  const e = Email.parse(opts.email);
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  let user: User = UserAgg.register(
    {
      id: UserId.generate(),
      email: e.value,
      passwordHash: h.value,
      roles: opts.massApprove ? [massApproveRole()] : [],
    },
    AT,
  ).user;
  const cpfVo = opts.cpf !== undefined ? Cpf.parse(opts.cpf) : undefined;
  user = UserAgg.updateProfile(
    user,
    { name: opts.name, ...(cpfVo?.ok ? { cpf: cpfVo.value } : {}) },
    AT,
  ).user;
  if (opts.disabled) user = UserAgg.disable(user as UserAgg.ActiveUser, AT).user;
  return user;
};

const reader = (users: readonly User[]): UserReader => ({
  findById: (id) => Promise.resolve(ok(users.find((u) => u.id === id) ?? null)),
  findByEmail: () => Promise.resolve(ok(null)),
});

describe('getUser', () => {
  it('CA1: id existente retorna UserDetail com campos de perfil', async () => {
    const u = mkUser({ email: 'amanda@x.com', name: 'Amanda Manoel', cpf: '52998224725' });
    const r = await getUser({ userReader: reader([u]) })(String(u.id));

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.id, String(u.id));
      assert.equal(r.value.name, 'Amanda Manoel');
      assert.equal(r.value.email, 'amanda@x.com');
      assert.equal(r.value.cpf, '52998224725');
      assert.equal(r.value.active, true);
    }
  });

  it('CA2: id sem formato valido retorna err user-id-invalid', async () => {
    const r = await getUser({ userReader: reader([]) })('nao-e-uuid');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-id-invalid');
  });

  it('CA3: id valido inexistente retorna err user-not-found', async () => {
    const r = await getUser({ userReader: reader([]) })(String(UserId.generate()));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-not-found');
  });

  it('CA4: massApprovalPermission reflete a role contract:mass-approve', async () => {
    const withPerm = mkUser({ email: 'a@x.com', name: 'Com', massApprove: true });
    const without = mkUser({ email: 'b@x.com', name: 'Sem' });

    const r1 = await getUser({ userReader: reader([withPerm]) })(String(withPerm.id));
    const r2 = await getUser({ userReader: reader([without]) })(String(without.id));

    assert.equal(r1.ok && r1.value.massApprovalPermission, true);
    assert.equal(r2.ok && r2.value.massApprovalPermission, false);
  });

  it('CA5: usuario disabled retorna active=false', async () => {
    const u = mkUser({ email: 'c@x.com', name: 'Inativo', disabled: true });
    const r = await getUser({ userReader: reader([u]) })(String(u.id));
    assert.equal(r.ok && r.value.active, false);
  });
});
