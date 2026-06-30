/**
 * W0 (RED) - use cases revokeSession + revokeAllSessions (A7). Ticket: AUTH-USECASE-REVOKE-SESSION.
 *
 * Logout: revoga o refresh apresentado (single) ou toda a cadeia revogavel do usuario (global).
 * Idempotente: refresh inexistente -> ok (DD-SESSION-06). Popula via registerUser+authenticateUser.
 * DEVE FALHAR em W0 (use cases inexistentes). ASCII puro. Fake minter: tokenHash === `${token}-hash`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  revokeSession,
  revokeAllSessions,
} from '#src/modules/auth/application/use-cases/revoke-session.ts';
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
import * as RefreshToken from '#src/modules/auth/domain/session/refresh-token.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');
const EMAIL = 'user@example.com';
const OTHER_EMAIL = 'other@example.com';
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
  const deps = {
    refreshTokenMinter,
    refreshTokenRepo: refreshStore.repository,
    clock: ClockFixed(AT),
  };
  return {
    refreshStore,
    register,
    authenticate,
    revoke: revokeSession(deps),
    revokeAll: revokeAllSessions(deps),
  };
};

type Ctx = ReturnType<typeof makeCtx>;

const registerOnce = async (ctx: Ctx, email: string): Promise<void> => {
  const r = await ctx.register({ email, password: PASSWORD });
  assert.equal(r.ok, true);
};

// Cada login gera um refresh distinto (fake minter incrementa) -> simula varios dispositivos.
const login = async (ctx: Ctx, email: string): Promise<string> => {
  const a = await ctx.authenticate({ email, password: PASSWORD });
  assert.equal(a.ok, true);
  if (!a.ok) throw new Error('authenticate');
  return a.value.refreshToken;
};

const findByClear = async (ctx: Ctx, clear: string) => {
  const found = await ctx.refreshStore.repository.findByTokenHash(`${clear}-hash`);
  assert.equal(found.ok, true);
  if (!found.ok) throw new Error('repo');
  return found.value;
};

describe('revokeSession (A7)', () => {
  it('CA1: refresh valido -> ok e o token fica revoked', async () => {
    const ctx = makeCtx();
    await registerOnce(ctx, EMAIL);
    const rt = await login(ctx, EMAIL);

    const r = await ctx.revoke({ refreshToken: rt });
    assert.equal(r.ok, true);

    const token = await findByClear(ctx, rt);
    assert.notEqual(token?.revokedAt, null);
    if (token !== null) {
      const verified = RefreshToken.verify(token, AT);
      assert.equal(!verified.ok && verified.error === 'refresh-token-revoked', true);
    }
  });

  it('CA2: refresh inexistente -> ok (idempotente)', async () => {
    const ctx = makeCtx();
    const r = await ctx.revoke({ refreshToken: 'nao-existe' });
    assert.equal(r.ok, true);
  });

  it('CA3: revoke 2x no mesmo token -> ok e revokedAt nao muda (no-op)', async () => {
    const ctx = makeCtx();
    await registerOnce(ctx, EMAIL);
    const rt = await login(ctx, EMAIL);

    const r1 = await ctx.revoke({ refreshToken: rt });
    assert.equal(r1.ok, true);
    const first = await findByClear(ctx, rt);
    const firstRevokedAt = first?.revokedAt?.getTime();

    const r2 = await ctx.revoke({ refreshToken: rt });
    assert.equal(r2.ok, true);
    const second = await findByClear(ctx, rt);
    assert.equal(second?.revokedAt?.getTime(), firstRevokedAt);
  });
});

describe('revokeAllSessions (A7)', () => {
  it('CA4: usuario com 2 sessoes -> ok e ambas ficam revoked', async () => {
    const ctx = makeCtx();
    await registerOnce(ctx, EMAIL);
    const rt1 = await login(ctx, EMAIL);
    const rt2 = await login(ctx, EMAIL);

    const r = await ctx.revokeAll({ refreshToken: rt1 });
    assert.equal(r.ok, true);

    const t1 = await findByClear(ctx, rt1);
    const t2 = await findByClear(ctx, rt2);
    assert.notEqual(t1?.revokedAt, null);
    assert.notEqual(t2?.revokedAt, null);
  });

  it('CA5: nao revoga sessoes de outro usuario', async () => {
    const ctx = makeCtx();
    await registerOnce(ctx, EMAIL);
    const rtA = await login(ctx, EMAIL);
    await registerOnce(ctx, OTHER_EMAIL);
    const rtB = await login(ctx, OTHER_EMAIL);

    await ctx.revokeAll({ refreshToken: rtA });

    const tB = await findByClear(ctx, rtB);
    assert.equal(tB?.revokedAt, null);
  });

  it('CA6: refresh inexistente -> ok (idempotente)', async () => {
    const ctx = makeCtx();
    const r = await ctx.revokeAll({ refreshToken: 'nao-existe' });
    assert.equal(r.ok, true);
  });
});
