/**
 * W0 (RED) - activateUser / deactivateUser (modulo auth, US5 da spec 005).
 *
 * Ticket: AUTH-USECASE-ACTIVATE-DEACTIVATE. Cobre CA1..CA6:
 *   CA1: deactivate de ativo -> save disabled + disabledAt; evento UserDisabled
 *   CA2: activate de inativo -> save active; evento UserEnabled
 *   CA3: deactivate de ja-inativo -> idempotente (event null, save nao chamado)
 *   CA4: activate de ja-ativo -> idempotente (event null, save nao chamado)
 *   CA5: deactivate com actorId === targetId -> cannot-deactivate-self; save nao chamado
 *   CA6: id inexistente -> user-not-found
 *
 * DEVE FALHAR em W0 - activate-deactivate-user.ts ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import {
  activateUser,
  deactivateUser,
} from '#src/modules/auth/application/use-cases/activate-deactivate-user.ts';
import type {
  UserReader,
  UserRepository,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import * as UserAgg from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

const AT = new Date('2026-06-07T12:00:00.000Z');

const mkUser = (opts: { email: string; disabled?: boolean }): User => {
  const e = Email.parse(opts.email);
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  const active = UserAgg.register(
    { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [] },
    AT,
  ).user;
  return opts.disabled ? UserAgg.disable(active, AT).user : active;
};

interface Captured {
  saved: User | null;
}

const makeDeps = (users: readonly User[]) => {
  const captured: Captured = { saved: null };
  const userReader: UserReader = {
    findById: (id) => Promise.resolve(ok(users.find((u) => u.id === id) ?? null)),
    findByEmail: () => Promise.resolve(ok(null)),
  };
  const userRepo: UserRepository = {
    save: (user) => {
      captured.saved = user;
      return Promise.resolve(ok(undefined));
    },
  };
  return { deps: { userReader, userRepo, clock: ClockFixed(AT) }, captured };
};

describe('deactivateUser', () => {
  it('CA1: desativa usuario ativo -> save disabled + disabledAt; evento UserDisabled', async () => {
    const u = mkUser({ email: 'ativo@x.com' });
    const { deps, captured } = makeDeps([u]);
    const admin = UserId.generate();

    const r = await deactivateUser(deps)({ actorId: String(admin), targetId: String(u.id) });

    assert.equal(r.ok, true);
    assert.equal(captured.saved?.status, 'disabled');
    if (captured.saved?.status === 'disabled') {
      assert.deepEqual(captured.saved.disabledAt, AT);
    }
    if (r.ok) assert.equal(r.value.event?.type, 'UserDisabled');
  });

  it('CA3: desativar ja-inativo e idempotente (event null, save nao chamado)', async () => {
    const u = mkUser({ email: 'inativo@x.com', disabled: true });
    const { deps, captured } = makeDeps([u]);
    const admin = UserId.generate();

    const r = await deactivateUser(deps)({ actorId: String(admin), targetId: String(u.id) });

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.event, null);
    assert.equal(captured.saved, null);
  });

  it('CA5: actorId === targetId -> cannot-deactivate-self; save nao chamado', async () => {
    const u = mkUser({ email: 'self@x.com' });
    const { deps, captured } = makeDeps([u]);

    const r = await deactivateUser(deps)({ actorId: String(u.id), targetId: String(u.id) });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cannot-deactivate-self');
    assert.equal(captured.saved, null);
  });

  it('CA6: id inexistente -> user-not-found', async () => {
    const { deps } = makeDeps([]);
    const r = await deactivateUser(deps)({
      actorId: String(UserId.generate()),
      targetId: String(UserId.generate()),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-not-found');
  });
});

describe('activateUser', () => {
  it('CA2: ativa usuario inativo -> save active; evento UserEnabled', async () => {
    const u = mkUser({ email: 'inativo2@x.com', disabled: true });
    const { deps, captured } = makeDeps([u]);

    const r = await activateUser(deps)({ targetId: String(u.id) });

    assert.equal(r.ok, true);
    assert.equal(captured.saved?.status, 'active');
    if (r.ok) assert.equal(r.value.event?.type, 'UserEnabled');
  });

  it('CA4: ativar ja-ativo e idempotente (event null, save nao chamado)', async () => {
    const u = mkUser({ email: 'ativo2@x.com' });
    const { deps, captured } = makeDeps([u]);

    const r = await activateUser(deps)({ targetId: String(u.id) });

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.event, null);
    assert.equal(captured.saved, null);
  });

  it('CA6: id inexistente -> user-not-found', async () => {
    const { deps } = makeDeps([]);
    const r = await activateUser(deps)({ targetId: String(UserId.generate()) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-not-found');
  });
});
