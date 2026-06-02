/**
 * W0 (RED) - use case changePassword (A8). Ticket: AUTH-USECASE-CHANGE-PASSWORD.
 *
 * Re-autentica (senha atual) -> troca a senha -> revoga TODAS as sessoes (DD-USER-06, OWASP ASVS V3.3).
 * Popula via registerUser+authenticateUser. DEVE FALHAR em W0 (use case inexistente). ASCII puro.
 * Fake hasher: digest(plain) = `fake-sha256:<sha256>`. Fake minter: tokenHash === `${token}-hash`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { changePassword } from '#src/modules/auth/application/use-cases/change-password.ts';
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
import * as Password from '#src/modules/auth/domain/credential/password-policy.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');
const EMAIL = 'user@example.com';
const OTHER_EMAIL = 'other@example.com';
const PASSWORD = 'super-secret-123';
const NEW_PASSWORD = 'brand-new-pass-456';
const REFRESH_TTL = 2_592_000;

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
  const change = changePassword({
    userReader: store.reader,
    userRepo: store.repository,
    passwordHasher,
    refreshTokenRepo: refreshStore.repository,
    clock: ClockFixed(AT),
  });
  return { store, refreshStore, passwordHasher, register, authenticate, change };
};

type Ctx = ReturnType<typeof makeCtx>;

const registerOnce = async (ctx: Ctx, email: string): Promise<UserId.UserId> => {
  const r = await ctx.register({ email, password: PASSWORD });
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error('register');
  return r.value.user.id;
};

const login = async (ctx: Ctx, email: string): Promise<string> => {
  const a = await ctx.authenticate({ email, password: PASSWORD });
  assert.equal(a.ok, true);
  if (!a.ok) throw new Error('authenticate');
  return a.value.refreshToken;
};

const verifyPlain = async (ctx: Ctx, userId: UserId.UserId, plain: string): Promise<boolean> => {
  const u = await ctx.store.reader.findById(userId);
  if (!u.ok || u.value?.passwordHash == null) return false;
  const p = Password.parse(plain);
  if (!p.ok) return false;
  const v = await ctx.passwordHasher.verify(p.value, u.value.passwordHash);
  return v.ok && v.value;
};

const isRevoked = async (ctx: Ctx, clear: string): Promise<boolean> => {
  const found = await ctx.refreshStore.repository.findByTokenHash(`${clear}-hash`);
  return found.ok && found.value !== null && found.value.revokedAt !== null;
};

describe('changePassword (A8)', () => {
  it('CA1: senha atual correta + nova valida -> ok, evento e hash trocado', async () => {
    const ctx = makeCtx();
    const userId = await registerOnce(ctx, EMAIL);

    const r = await ctx.change({ userId, currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.event.type, 'PasswordChanged');
    assert.equal(await verifyPlain(ctx, userId, NEW_PASSWORD), true);
    assert.equal(await verifyPlain(ctx, userId, PASSWORD), false);
  });

  it('CA2: senha atual errada -> invalid-credentials e senha nao muda', async () => {
    const ctx = makeCtx();
    const userId = await registerOnce(ctx, EMAIL);

    const r = await ctx.change({
      userId,
      currentPassword: 'wrong-pass-000',
      newPassword: NEW_PASSWORD,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
    assert.equal(await verifyPlain(ctx, userId, PASSWORD), true);
  });

  it('CA3: nova senha curta -> password-too-short e senha nao muda', async () => {
    const ctx = makeCtx();
    const userId = await registerOnce(ctx, EMAIL);

    const r = await ctx.change({ userId, currentPassword: PASSWORD, newPassword: 'short' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'password-too-short');
    assert.equal(await verifyPlain(ctx, userId, PASSWORD), true);
  });

  it('CA4: user inexistente -> invalid-credentials', async () => {
    const ctx = makeCtx();
    const r = await ctx.change({
      userId: UserId.generate(),
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-credentials');
  });

  it('CA5: user disabled -> user-disabled', async () => {
    const ctx = makeCtx();
    const reg = await ctx.register({ email: EMAIL, password: PASSWORD });
    if (!reg.ok) return;
    const { user: disabled } = User.disable(reg.value.user, AT);
    await ctx.store.repository.save(disabled);

    const r = await ctx.change({
      userId: reg.value.user.id,
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-disabled');
  });

  it('CA6: troca OK -> todas as sessoes do usuario ficam revoked', async () => {
    const ctx = makeCtx();
    const userId = await registerOnce(ctx, EMAIL);
    const rt1 = await login(ctx, EMAIL);
    const rt2 = await login(ctx, EMAIL);

    const r = await ctx.change({ userId, currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    assert.equal(r.ok, true);

    assert.equal(await isRevoked(ctx, rt1), true);
    assert.equal(await isRevoked(ctx, rt2), true);
  });

  it('CA7: nao revoga sessoes de outro usuario', async () => {
    const ctx = makeCtx();
    const userId = await registerOnce(ctx, EMAIL);
    await login(ctx, EMAIL);
    await registerOnce(ctx, OTHER_EMAIL);
    const rtOther = await login(ctx, OTHER_EMAIL);

    await ctx.change({ userId, currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

    assert.equal(await isRevoked(ctx, rtOther), false);
  });
});
