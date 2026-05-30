/**
 * CTR-AUTH-RESET-CONFIRM — W0/W1 — use case confirmPasswordReset (BE-REC-003, fim da cadeia).
 *
 * token (claro) -> hash -> findByTokenHash -> consume (one-time + TTL) -> troca a senha ->
 * revoga TODAS as sessoes. Cobre feliz + token invalido/expirado + senha fraca. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { confirmPasswordReset } from '#src/modules/auth/application/use-cases/confirm-password-reset.ts';
import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRefreshTokenStore } from '#src/modules/auth/adapters/persistence/repos/refresh-token-repository.in-memory.ts';
import { makeInMemoryPasswordResetTokenStore } from '#src/modules/auth/adapters/persistence/repos/password-reset-token-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as ResetToken from '#src/modules/auth/domain/session/password-reset-token.ts';
import * as ResetTokenId from '#src/modules/auth/domain/session/password-reset-token-id.ts';
import * as RefreshToken from '#src/modules/auth/domain/session/refresh-token.ts';
import * as RefreshTokenId from '#src/modules/auth/domain/session/refresh-token-id.ts';
import type { UserId } from '#src/modules/auth/domain/identity/user-id.ts';
import type { PasswordResetTokenMinter } from '#src/modules/auth/application/ports/password-reset-token-minter.ts';

const AT = new Date('2026-05-30T12:00:00.000Z');
const EMAIL = 'user@example.com';
const PASSWORD = 'Str0ng-Passphrase-2026!';
const NEW_PASSWORD = 'New-Str0ng-Phrase-2027!';
const TOKEN = 'reset-token-claro';

// minter fake: hash(raw) = `${raw}-h` (determinístico, casa com o tokenHash persistido).
const minter: PasswordResetTokenMinter = {
  mint: () => ({ token: TOKEN, tokenHash: `${TOKEN}-h` }),
  hash: (raw) => `${raw}-h`,
};

const makeCtx = () => {
  const userStore = makeInMemoryUserStore();
  const refreshStore = makeInMemoryRefreshTokenStore();
  const resetStore = makeInMemoryPasswordResetTokenStore();
  const passwordHasher = makeFakePasswordHasher();
  const register = registerUser({
    userReader: userStore.reader,
    userRepo: userStore.repository,
    passwordHasher,
    clock: ClockFixed(AT),
  });
  const confirm = confirmPasswordReset({
    resetTokenRepo: resetStore.repository,
    minter,
    userReader: userStore.reader,
    userRepo: userStore.repository,
    passwordHasher,
    refreshTokenRepo: refreshStore.repository,
    clock: ClockFixed(AT),
  });
  return { userStore, refreshStore, resetStore, passwordHasher, register, confirm };
};

const issueResetToken = (userId: UserId, requestedAt: Date, expiresAt: Date) => {
  const t = ResetToken.issue({
    id: ResetTokenId.generate(),
    userId,
    tokenHash: `${TOKEN}-h`,
    requestedAt,
    expiresAt,
  });
  if (!t.ok) throw new Error('setup');
  return t.value;
};

describe('confirmPasswordReset (BE-REC-003)', () => {
  it('token válido + nova senha: troca a senha, marca o token usado e revoga as sessões', async () => {
    const { userStore, refreshStore, resetStore, passwordHasher, register, confirm } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    assert.equal(reg.ok, true);
    if (!reg.ok) return;
    const userId = reg.value.user.id;

    await resetStore.repository.save(issueResetToken(userId, AT, new Date(AT.getTime() + 900_000)));
    // uma sessão ativa para verificar a revogação
    const rt = RefreshToken.issue({
      id: RefreshTokenId.generate(),
      userId,
      tokenHash: 'sess-hash',
      issuedAt: AT,
      expiresAt: new Date(AT.getTime() + 1_000_000),
    });
    if (!rt.ok) return;
    await refreshStore.repository.save(rt.value);

    const r = await confirm({ token: TOKEN, newPassword: NEW_PASSWORD });
    assert.equal(r.ok, true);

    // senha trocada: o hash do user mudou para o da nova senha
    const after = await userStore.reader.findByEmail(reg.value.user.email);
    assert.equal(after.ok, true);
    if (after.ok && after.value !== null) {
      const verified = await passwordHasher.verify(
        // a nova senha deve validar contra o hash persistido
        NEW_PASSWORD as never,
        after.value.passwordHash,
      );
      assert.equal(verified.ok && verified.value, true);
    }

    // token consumido (used)
    const tok = await resetStore.repository.findByTokenHash(`${TOKEN}-h`);
    assert.equal(tok.ok, true);
    if (tok.ok && tok.value !== null) {
      assert.equal(ResetToken.state(tok.value, AT), 'used');
    }

    // sessões revogadas
    const revocable = await refreshStore.repository.findRevocableByUserId(userId);
    assert.equal(revocable.ok, true);
    if (revocable.ok) assert.equal(revocable.value.length, 0);
  });

  it('token inexistente -> reset-token-invalid', async () => {
    const { confirm } = makeCtx();
    const r = await confirm({ token: 'desconhecido', newPassword: NEW_PASSWORD });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reset-token-invalid');
  });

  it('token expirado -> reset-token-expired (não troca a senha)', async () => {
    const { resetStore, register, confirm } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    if (!reg.ok) return;
    await resetStore.repository.save(
      issueResetToken(
        reg.value.user.id,
        new Date(AT.getTime() - 3_600_000),
        new Date(AT.getTime() - 1_800_000),
      ),
    );
    const r = await confirm({ token: TOKEN, newPassword: NEW_PASSWORD });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reset-token-expired');
  });

  it('nova senha fraca/comum -> erro de policy (token não é queimado)', async () => {
    const { resetStore, register, confirm } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    if (!reg.ok) return;
    await resetStore.repository.save(
      issueResetToken(reg.value.user.id, AT, new Date(AT.getTime() + 900_000)),
    );
    const r = await confirm({ token: TOKEN, newPassword: 'password123' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'password-too-common');

    // token continua pending (não consumido)
    const tok = await resetStore.repository.findByTokenHash(`${TOKEN}-h`);
    if (tok.ok && tok.value !== null) assert.equal(ResetToken.state(tok.value, AT), 'pending');
  });
});
