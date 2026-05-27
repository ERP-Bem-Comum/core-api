/**
 * W0 (RED) - Tests para o agregado User do modulo auth.
 *
 * Ticket: AUTH-AGG-USER. Decisoes: handbook/domain/auth/design-decisions.md (DD-USER-01..05).
 *
 * status como uniao refinada ActiveUser | DisabledUser. Transicoes puras retornam {user,event}.
 * changePassword recebe PasswordHash pronto. Eventos sem segredo no payload.
 *
 * Cobre CA4..CA8. DEVEM FALHAR em W0 - user.ts nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';

// --- helpers de setup (throw em teste e permitido) ---
const email = (raw: string): Email.Email => {
  const r = Email.parse(raw);
  if (!r.ok) throw new Error('setup email');
  return r.value;
};
const hash = (raw: string): PasswordHash.PasswordHash => {
  const r = PasswordHash.fromString(raw);
  if (!r.ok) throw new Error('setup hash');
  return r.value;
};
const perm = (raw: string): Permission.Permission => {
  const r = Permission.parse(raw);
  if (!r.ok) throw new Error('setup perm');
  return r.value;
};
const role = (name: string, permissions: readonly Permission.Permission[]): Role.Role => {
  const r = Role.create({ id: RoleId.generate(), name, permissions });
  if (!r.ok) throw new Error('setup role');
  return r.value;
};

const AT = new Date('2026-05-27T12:00:00.000Z');

const buildActive = (roles: readonly Role.Role[] = []): User.ActiveUser => {
  const { user } = User.register(
    {
      id: UserId.generate(),
      email: email('user@example.com'),
      passwordHash: hash('$argon2id$x'),
      roles,
    },
    AT,
  );
  return user;
};

describe('User.register', () => {
  it('CA4: register cria ActiveUser + evento UserRegistered', () => {
    const id = UserId.generate();
    const { user, event } = User.register(
      { id, email: email('a@b.com'), passwordHash: hash('$argon2id$h'), roles: [] },
      AT,
    );
    assert.equal(user.status, 'active');
    assert.equal(event.type, 'UserRegistered');
    assert.equal(event.userId, id);
    assert.deepEqual(event.occurredAt, AT);
  });

  it('CA4: register deduplica roles por RoleId', () => {
    const r = role('Admin', [perm('contract:delete')]);
    const { user } = User.register(
      { id: UserId.generate(), email: email('a@b.com'), passwordHash: hash('$h'), roles: [r, r] },
      AT,
    );
    assert.equal(user.roles.length, 1);
  });
});

describe('User.parseActive', () => {
  it('CA5: parseActive de ActiveUser retorna ok', () => {
    const r = User.parseActive(buildActive());
    assert.equal(r.ok, true);
  });

  it('CA5: parseActive de DisabledUser retorna err user-disabled', () => {
    const { user: disabled } = User.disable(buildActive(), AT);
    const r = User.parseActive(disabled);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'user-disabled');
    }
  });
});

describe('User.disable', () => {
  it('CA6: disable produz DisabledUser + UserDisabled', () => {
    const { user, event } = User.disable(buildActive(), AT);
    assert.equal(user.status, 'disabled');
    assert.deepEqual(user.disabledAt, AT);
    assert.equal(event.type, 'UserDisabled');
    assert.deepEqual(event.occurredAt, AT);
  });
});

describe('User.changePassword', () => {
  it('CA7: changePassword troca o hash + PasswordChanged sem hash no payload', () => {
    const active = buildActive();
    const newHash = hash('$argon2id$novo');
    const { user, event } = User.changePassword(active, newHash, AT);
    assert.equal(user.passwordHash, newHash);
    assert.equal(event.type, 'PasswordChanged');
    // payload nao deve conter o hash (o proprio tipo do evento ja garante; checagem defensiva)
    assert.equal(Object.values(event as Record<string, unknown>).includes(newHash), false);
  });
});

describe('User.assignRole', () => {
  it('CA8: assignRole adiciona role + RoleAssigned', () => {
    const r = role('Gestor', [perm('contract:delete')]);
    const { user, event } = User.assignRole(buildActive(), r, AT);
    assert.equal(user.roles.length, 1);
    assert.equal(event.type, 'RoleAssigned');
    assert.equal(event.roleId, r.id);
  });

  it('CA8: assignRole e idempotente por RoleId', () => {
    const r = role('Gestor', [perm('contract:delete')]);
    const once = User.assignRole(buildActive([r]), r, AT);
    assert.equal(once.user.roles.length, 1);
  });
});
