/**
 * W0 (RED) - use case registerUser (modulo auth). Ticket: AUTH-USECASE-REGISTER-USER (A4).
 *
 * Imperative Shell: InMemory user store + fake hasher + clock fixo. Cobre CA1..CA5.
 * DEVE FALHAR em W0 - register-user.ts nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Password from '#src/modules/auth/domain/credential/password-policy.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');

const makeDeps = () => {
  const store = makeInMemoryUserStore();
  const passwordHasher = makeFakePasswordHasher();
  return {
    store,
    passwordHasher,
    deps: {
      userReader: store.reader,
      userRepo: store.repository,
      passwordHasher,
      clock: ClockFixed(AT),
    },
  };
};

describe('registerUser', () => {
  it('CA1: input valido cria e persiste ActiveUser + evento UserRegistered', async () => {
    const { deps, store } = makeDeps();
    const r = await registerUser(deps)({ email: 'User@Example.com', password: 'super-secret-123' });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.user.status, 'active');
    assert.equal(r.value.user.email, 'user@example.com'); // normalizado pelo VO
    assert.equal(r.value.event.type, 'UserRegistered');
    assert.deepEqual(r.value.event.occurredAt, AT);

    const found = await store.reader.findById(r.value.user.id);
    assert.equal(found.ok, true);
    if (found.ok) assert.notEqual(found.value, null);
  });

  it('CA2: email invalido retorna err email-invalid-format', async () => {
    const { deps } = makeDeps();
    const r = await registerUser(deps)({ email: 'invalid', password: 'super-secret-123' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'email-invalid-format');
  });

  it('CA3: senha curta retorna err password-too-short', async () => {
    const { deps } = makeDeps();
    const r = await registerUser(deps)({ email: 'a@b.com', password: 'short' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'password-too-short');
  });

  it('CA4: email duplicado retorna err email-already-registered', async () => {
    const { deps } = makeDeps();
    const run = registerUser(deps);
    const first = await run({ email: 'dup@example.com', password: 'super-secret-123' });
    assert.equal(first.ok, true);
    const second = await run({ email: 'dup@example.com', password: 'outra-senha-999' });
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.error, 'email-already-registered');
  });

  it('CA5: persiste hash, nunca a senha em claro', async () => {
    const { deps, passwordHasher } = makeDeps();
    const r = await registerUser(deps)({ email: 'safe@example.com', password: 'super-secret-123' });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.notEqual(r.value.user.passwordHash, 'super-secret-123');
    const pw = Password.parse('super-secret-123');
    if (!pw.ok) throw new Error('fixture');
    const v = await passwordHasher.verify(pw.value, r.value.user.passwordHash);
    assert.equal(v.ok && v.value, true);
  });
});
