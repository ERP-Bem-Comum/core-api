/**
 * W0 (RED) - use case refreshAccessToken (A6b). Ticket: AUTH-USECASE-REFRESH-ACCESS.
 *
 * Rotaciona o refresh: valida o refresh em claro -> verify -> (defense-in-depth User ativo) -> rotate +
 * novo par (access JWT + novo refresh). Reuse detection: refresh ja rotated -> revoga a cadeia ativa.
 * Popula via registerUser+authenticateUser. DEVE FALHAR em W0 (use case inexistente). ASCII puro.
 *
 * Convencao do fake minter: tokenHash === hash(token) === `${token}-hash`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import type { TokenIssuer } from '#src/modules/auth/application/ports/token-issuer.ts';
import { refreshAccessToken } from '#src/modules/auth/application/use-cases/refresh-access-token.ts';
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
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as RefreshToken from '#src/modules/auth/domain/session/refresh-token.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');
const EMAIL = 'user@example.com';
const PASSWORD = 'super-secret-123';
const REFRESH_TTL = 2_592_000; // 30 dias

const makeCtx = () => {
  const store = makeInMemoryUserStore();
  const refreshStore = makeInMemoryRefreshTokenStore();
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
    lockoutStore: makeInMemoryLoginLockoutStore(),
    lockoutPolicy: TEST_LOCKOUT_POLICY,
  });
  const makeRefresh = (clockAt: Date = AT) =>
    refreshAccessToken({
      userReader: store.reader,
      tokenIssuer,
      refreshTokenMinter,
      refreshTokenRepo: refreshStore.repository,
      clock: ClockFixed(clockAt),
      refreshTtlSeconds: REFRESH_TTL,
    });
  return {
    store,
    refreshStore,
    tokenIssuer,
    refreshTokenMinter,
    register,
    authenticate,
    makeRefresh,
  };
};

// Helper: register + login -> refresh em claro + userId.
const login = async (ctx: ReturnType<typeof makeCtx>) => {
  const reg = await ctx.register({ email: EMAIL, password: PASSWORD });
  assert.equal(reg.ok, true);
  if (!reg.ok) throw new Error('register');
  const auth = await ctx.authenticate({ email: EMAIL, password: PASSWORD });
  assert.equal(auth.ok, true);
  if (!auth.ok) throw new Error('authenticate');
  return { userId: reg.value.user.id, refreshToken: auth.value.refreshToken, user: reg.value.user };
};

describe('refreshAccessToken (A6b)', () => {
  it('CA1: refresh valido -> novo access verificavel + novo refresh + userId', async () => {
    const ctx = makeCtx();
    const { userId, refreshToken } = await login(ctx);

    const r = await ctx.makeRefresh()({ refreshToken });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.accessToken.length > 0, true);
    assert.equal(r.value.refreshToken.length > 0, true);
    assert.notEqual(r.value.refreshToken, refreshToken);
    assert.equal(r.value.userId, userId);

    const claims = await ctx.tokenIssuer.verifyAccessToken(r.value.accessToken);
    assert.equal(claims.ok && claims.value.userId === userId, true);
  });

  it('CA1 (regressao): falha do tokenIssuer NAO consome o refresh apresentado', async () => {
    const ctx = makeCtx();
    const { refreshToken } = await login(ctx);
    const failingIssuer: TokenIssuer = {
      issueAccessToken: async () => {
        await Promise.resolve();
        return err('token-issue-failed');
      },
      verifyAccessToken: async () => {
        await Promise.resolve();
        return err('token-invalid');
      },
    };
    const refresh = refreshAccessToken({
      userReader: ctx.store.reader,
      tokenIssuer: failingIssuer,
      refreshTokenMinter: ctx.refreshTokenMinter,
      refreshTokenRepo: ctx.refreshStore.repository,
      clock: ClockFixed(AT),
      refreshTtlSeconds: REFRESH_TTL,
    });

    const r = await refresh({ refreshToken });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'token-issue-failed');

    // o refresh apresentado deve continuar active (nao rotacionado): replacedBy === null
    const found = await ctx.refreshStore.repository.findByTokenHash(`${refreshToken}-hash`);
    assert.equal(
      found.ok && found.value?.replacedBy === null && found.value.revokedAt === null,
      true,
    );
  });

  it('CA2: o refresh antigo fica rotated; o novo esta persistido e active', async () => {
    const ctx = makeCtx();
    const { refreshToken } = await login(ctx);
    const r = await ctx.makeRefresh()({ refreshToken });
    if (!r.ok) return;

    const oldFound = await ctx.refreshStore.repository.findByTokenHash(`${refreshToken}-hash`);
    assert.equal(oldFound.ok && oldFound.value?.replacedBy !== null, true);

    const newFound = await ctx.refreshStore.repository.findByTokenHash(
      `${r.value.refreshToken}-hash`,
    );
    assert.equal(newFound.ok, true);
    if (newFound.ok && newFound.value !== null) {
      assert.equal(RefreshToken.verify(newFound.value, AT).ok, true);
    } else {
      assert.fail('novo refresh nao persistido');
    }
  });

  it('CA3: refresh inexistente -> refresh-token-not-found', async () => {
    const ctx = makeCtx();
    const r = await ctx.makeRefresh()({ refreshToken: 'nao-existe' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'refresh-token-not-found');
  });

  it('CA4: refresh expirado -> refresh-token-expired', async () => {
    const ctx = makeCtx();
    const { refreshToken } = await login(ctx);
    const later = new Date(AT.getTime() + REFRESH_TTL * 1000 + 1000);
    const r = await ctx.makeRefresh(later)({ refreshToken });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'refresh-token-expired');
  });

  it('CA5: refresh revogado -> refresh-token-revoked', async () => {
    const ctx = makeCtx();
    const { refreshToken } = await login(ctx);
    const found = await ctx.refreshStore.repository.findByTokenHash(`${refreshToken}-hash`);
    if (found.ok && found.value !== null) {
      await ctx.refreshStore.repository.save(RefreshToken.revoke(found.value, AT));
    } else {
      assert.fail('refresh nao persistido');
    }
    const r = await ctx.makeRefresh()({ refreshToken });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'refresh-token-revoked');
  });

  it('CA6: user disabled -> user-disabled E o refresh apresentado fica revoked', async () => {
    const ctx = makeCtx();
    const { refreshToken, user } = await login(ctx);
    const { user: disabled } = User.disable(user, AT);
    await ctx.store.repository.save(disabled);

    const r = await ctx.makeRefresh()({ refreshToken });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-disabled');

    const found = await ctx.refreshStore.repository.findByTokenHash(`${refreshToken}-hash`);
    assert.equal(found.ok && found.value?.revokedAt !== null, true);
  });

  it('CA7: reuse detection - refresh ja rotated revoga a cadeia ativa do usuario', async () => {
    const ctx = makeCtx();
    const { refreshToken } = await login(ctx);
    const first = await ctx.makeRefresh()({ refreshToken });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const newRefresh = first.value.refreshToken;

    // reapresenta o refresh antigo (agora rotated)
    const reuse = await ctx.makeRefresh()({ refreshToken });
    assert.equal(reuse.ok, false);
    if (!reuse.ok) assert.equal(reuse.error, 'refresh-token-rotated');

    // cadeia revogada: o refresh NOVO (emitido no first) tambem fica revoked
    const newFound = await ctx.refreshStore.repository.findByTokenHash(`${newRefresh}-hash`);
    assert.equal(newFound.ok && newFound.value?.revokedAt !== null, true);
  });
});
