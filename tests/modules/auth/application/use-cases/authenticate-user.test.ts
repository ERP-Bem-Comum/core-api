/**
 * W0 (RED) - use case authenticateUser (A5). Ticket: AUTH-USECASE-AUTHENTICATE.
 *
 * Popula via registerUser; valida credencial + emite access JWT (fake). Cobre CA1..CA5.
 * DEVE FALHAR em W0 - authenticate-user.ts nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { authenticateUser } from '#src/modules/auth/application/use-cases/authenticate-user.ts';
import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { makeFakeTokenIssuer } from '#src/modules/auth/adapters/crypto/token-issuer.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');
const EMAIL = 'user@example.com';
const PASSWORD = 'super-secret-123';

const makeCtx = () => {
  const store = makeInMemoryUserStore();
  const passwordHasher = makeFakePasswordHasher();
  const tokenIssuer = makeFakeTokenIssuer();
  const register = registerUser({
    userReader: store.reader,
    userRepo: store.repository,
    passwordHasher,
    clock: ClockFixed(AT),
  });
  const authenticate = authenticateUser({ userReader: store.reader, passwordHasher, tokenIssuer });
  return { store, passwordHasher, tokenIssuer, register, authenticate };
};

describe('authenticateUser', () => {
  it('CA1: credencial correta -> ok com accessToken verificavel', async () => {
    const { register, authenticate, tokenIssuer } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    assert.equal(reg.ok, true);
    if (!reg.ok) return;

    const r = await authenticate({ email: EMAIL, password: PASSWORD });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.accessToken.length > 0, true);
    assert.equal(r.value.userId, reg.value.user.id);

    const claims = await tokenIssuer.verifyAccessToken(r.value.accessToken);
    assert.equal(claims.ok, true);
    if (claims.ok) assert.equal(claims.value.userId, reg.value.user.id);
  });

  it('CA2: email nao registrado -> invalid-credentials', async () => {
    const { authenticate } = makeCtx();
    const r = await authenticate({ email: 'ghost@example.com', password: PASSWORD });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
  });

  it('CA3: senha errada -> invalid-credentials', async () => {
    const { register, authenticate } = makeCtx();
    await register({ email: EMAIL, password: PASSWORD });
    const r = await authenticate({ email: EMAIL, password: 'senha-errada-000' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
  });

  it('CA4: email malformado -> invalid-credentials', async () => {
    const { authenticate } = makeCtx();
    const r = await authenticate({ email: 'invalid', password: PASSWORD });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
  });

  it('CA5: usuario disabled com senha correta -> user-disabled', async () => {
    const { register, authenticate, store } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    assert.equal(reg.ok, true);
    if (!reg.ok) return;
    const { user: disabled } = User.disable(reg.value.user, AT);
    await store.repository.save(disabled);

    const r = await authenticate({ email: EMAIL, password: PASSWORD });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-disabled');
  });
});
