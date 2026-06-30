/**
 * W0/W1 - use case authenticateUser (A5 + A5b). Ticket: AUTH-USECASE-AUTHENTICATE-REFRESH.
 *
 * Login: valida credencial -> access JWT + refresh opaco (mint + persist). Popula via registerUser.
 * Cobre login OK (access+refresh+persistencia) + regressao (invalid/disabled). ASCII puro.
 *
 * Convencao do fake minter: tokenHash === `${token}-hash` (usada para localizar o refresh persistido).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { authenticateUser } from '#src/modules/auth/application/use-cases/authenticate-user.ts';
import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRefreshTokenStore } from '#src/modules/auth/adapters/persistence/repos/refresh-token-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { makeFakeTokenIssuer } from '#src/modules/auth/adapters/crypto/token-issuer.fake.ts';
import { makeFakeRefreshTokenMinter } from '#src/modules/auth/adapters/crypto/refresh-token-minter.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { DUMMY_PASSWORD_HASH } from '../../_support/dummy-password-hash.ts';
import { makeInMemoryLoginLockoutStore, TEST_LOCKOUT_POLICY } from '../../_support/lockout.ts';
import type { PasswordHasher } from '#src/modules/auth/application/ports/password-hasher.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');
const EMAIL = 'user@example.com';
const PASSWORD = 'super-secret-123';
const REFRESH_TTL = 2_592_000; // 30 dias

const makeCtx = () => {
  const store = makeInMemoryUserStore();
  const refreshStore = makeInMemoryRefreshTokenStore();
  const lockoutStore = makeInMemoryLoginLockoutStore();
  const passwordHasher = makeFakePasswordHasher();
  const tokenIssuer = makeFakeTokenIssuer();
  const refreshTokenMinter = makeFakeRefreshTokenMinter();
  const register = registerUser({
    userReader: store.reader,
    userRepo: store.repository,
    passwordHasher,
    clock: ClockFixed(AT),
  });
  const authenticate = authenticateUser({
    userReader: store.reader,
    passwordHasher,
    tokenIssuer,
    refreshTokenMinter,
    refreshTokenRepo: refreshStore.repository,
    clock: ClockFixed(AT),
    refreshTtlSeconds: REFRESH_TTL,
    dummyPasswordHash: DUMMY_PASSWORD_HASH,
    lockoutStore,
    lockoutPolicy: TEST_LOCKOUT_POLICY,
  });
  return { store, refreshStore, tokenIssuer, register, authenticate, lockoutStore };
};

describe('authenticateUser (com refresh)', () => {
  it('CA1: login OK -> access JWT verificavel + refresh opaco', async () => {
    const { register, authenticate, tokenIssuer } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    assert.equal(reg.ok, true);
    if (!reg.ok) return;

    const r = await authenticate({ email: EMAIL, password: PASSWORD });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.accessToken.length > 0, true);
    assert.equal(r.value.refreshToken.length > 0, true);
    assert.equal(r.value.userId, reg.value.user.id);

    const claims = await tokenIssuer.verifyAccessToken(r.value.accessToken);
    assert.equal(claims.ok && claims.value.userId === reg.value.user.id, true);
  });

  it('CA5: o refresh e persistido (findByTokenHash) com userId e expiresAt = now + ttl', async () => {
    const { register, authenticate, refreshStore } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    if (!reg.ok) return;
    const r = await authenticate({ email: EMAIL, password: PASSWORD });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    // convencao do fake minter: tokenHash = `${token}-hash`
    const found = await refreshStore.repository.findByTokenHash(`${r.value.refreshToken}-hash`);
    assert.equal(found.ok, true);
    if (found.ok && found.value !== null) {
      assert.equal(found.value.userId, reg.value.user.id);
      assert.equal(found.value.expiresAt.getTime(), AT.getTime() + REFRESH_TTL * 1000);
    } else {
      assert.fail('refresh nao persistido');
    }
  });

  it('CA6 (regressao): email nao registrado -> invalid-credentials', async () => {
    const { authenticate } = makeCtx();
    const r = await authenticate({ email: 'ghost@example.com', password: PASSWORD });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
  });

  it('CA6 (regressao): senha errada -> invalid-credentials', async () => {
    const { register, authenticate } = makeCtx();
    await register({ email: EMAIL, password: PASSWORD });
    const r = await authenticate({ email: EMAIL, password: 'senha-errada-000' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
  });

  it('CA6 (regressao): email malformado -> invalid-credentials', async () => {
    const { authenticate } = makeCtx();
    const r = await authenticate({ email: 'invalid', password: PASSWORD });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
  });

  it('CA6 (regressao): disabled + senha correta -> user-disabled', async () => {
    const { register, authenticate, store } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    if (!reg.ok) return;
    const { user: disabled } = User.disable(reg.value.user, AT);
    await store.repository.save(disabled);
    const r = await authenticate({ email: EMAIL, password: PASSWORD });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-disabled');
  });

  // BE-REC-002 (anti-timing): com usuario inexistente, o verify ainda roda (contra o dummy hash),
  // para que o tempo de resposta seja equivalente ao ramo "senha errada".
  it('BE-REC-002: roda verify (dummy) mesmo quando o usuario nao existe', async () => {
    const base = makeFakePasswordHasher();
    let verifyCalls = 0;
    const spyHasher: PasswordHasher = {
      hash: base.hash,
      verify: (plain, hash) => {
        verifyCalls += 1;
        return base.verify(plain, hash);
      },
    };
    const store = makeInMemoryUserStore();
    const refreshStore = makeInMemoryRefreshTokenStore();
    const authenticate = authenticateUser({
      userReader: store.reader,
      passwordHasher: spyHasher,
      tokenIssuer: makeFakeTokenIssuer(),
      refreshTokenMinter: makeFakeRefreshTokenMinter(),
      refreshTokenRepo: refreshStore.repository,
      clock: ClockFixed(AT),
      refreshTtlSeconds: REFRESH_TTL,
      dummyPasswordHash: DUMMY_PASSWORD_HASH,
      lockoutStore: makeInMemoryLoginLockoutStore(),
      lockoutPolicy: TEST_LOCKOUT_POLICY,
    });

    const r = await authenticate({ email: 'ghost@example.com', password: PASSWORD });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
    assert.equal(verifyCalls, 1);
  });

  // BE-REC-001 (account lockout): após `threshold` falhas, a conta entra em cooldown — mesmo a
  // senha CORRETA é rejeitada com a resposta genérica (não vaza o bloqueio).
  it('BE-REC-001: cooldown após threshold falhas bloqueia até senha correta', async () => {
    const { register, authenticate } = makeCtx();
    await register({ email: EMAIL, password: PASSWORD });

    for (let i = 0; i < TEST_LOCKOUT_POLICY.threshold; i += 1) {
      const fail = await authenticate({ email: EMAIL, password: 'senha-errada-000' });
      assert.equal(fail.ok, false);
    }

    const blocked = await authenticate({ email: EMAIL, password: PASSWORD });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.error, 'invalid-credentials');
  });

  it('BE-REC-001: falhas abaixo do threshold não impedem o login com senha correta (reset)', async () => {
    const { register, authenticate } = makeCtx();
    await register({ email: EMAIL, password: PASSWORD });

    for (let i = 0; i < TEST_LOCKOUT_POLICY.threshold - 1; i += 1) {
      await authenticate({ email: EMAIL, password: 'senha-errada-000' });
    }

    const ok1 = await authenticate({ email: EMAIL, password: PASSWORD });
    assert.equal(ok1.ok, true);
  });
});
