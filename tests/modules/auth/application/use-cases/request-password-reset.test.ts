/**
 * CTR-AUTH-RESET-REQUEST — W0/W1 — use case requestPasswordReset (BE-REC-003). ASCII puro.
 *
 * Anti-enumeracao: conta inexistente -> ok sem enviar. Conta ativa -> token novo + email com link
 * (origem confiavel). Tokens pendentes anteriores sao invalidados.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { requestPasswordReset } from '#src/modules/auth/application/use-cases/request-password-reset.ts';
import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryPasswordResetTokenStore } from '#src/modules/auth/adapters/persistence/repos/password-reset-token-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import type { PasswordResetTokenMinter } from '#src/modules/auth/application/ports/password-reset-token-minter.ts';
import type { PasswordResetMailer } from '#src/modules/auth/application/ports/password-reset-mailer.ts';

const AT = new Date('2026-05-30T12:00:00.000Z');
const EMAIL = 'user@example.com';
const PASSWORD = 'Str0ng-Passphrase-2026!';
const BASE = 'https://app.local/reset';
const TTL = 900;

const makeCtx = () => {
  const userStore = makeInMemoryUserStore();
  const resetStore = makeInMemoryPasswordResetTokenStore();
  const passwordHasher = makeFakePasswordHasher();
  const register = registerUser({
    userReader: userStore.reader,
    userRepo: userStore.repository,
    passwordHasher,
    clock: ClockFixed(AT),
  });

  let n = 0;
  const minter: PasswordResetTokenMinter = {
    mint: () => {
      n += 1;
      return { token: `plain-${String(n)}`, tokenHash: `hash-${String(n)}` };
    },
    hash: (raw) => `${raw}-h`,
  };

  const mailerSent: { email: string; resetUrl: string }[] = [];
  const mailer: PasswordResetMailer = {
    sendResetLink: async (input) => {
      await Promise.resolve();
      mailerSent.push(input);
      return ok(undefined);
    },
  };

  const request = requestPasswordReset({
    userReader: userStore.reader,
    resetTokenRepo: resetStore.repository,
    minter,
    mailer,
    clock: ClockFixed(AT),
    resetTtlSeconds: TTL,
    resetBaseUrl: BASE,
  });

  return { register, request, resetStore, mailerSent };
};

describe('requestPasswordReset (BE-REC-003)', () => {
  it('conta ativa -> emite token + envia link com origem confiável', async () => {
    const { register, request, resetStore, mailerSent } = makeCtx();
    await register({ email: EMAIL, password: PASSWORD });

    const r = await request({ email: EMAIL });
    assert.equal(r.ok, true);
    assert.equal(mailerSent.length, 1);
    assert.equal(mailerSent[0]?.resetUrl, `${BASE}?token=plain-1`);

    const persisted = await resetStore.repository.findByTokenHash('hash-1');
    assert.equal(persisted.ok, true);
    if (persisted.ok) assert.notEqual(persisted.value, null);
  });

  it('conta inexistente -> ok sem enviar (anti-enumeração)', async () => {
    const { request, mailerSent } = makeCtx();
    const r = await request({ email: 'ghost@example.com' });
    assert.equal(r.ok, true);
    assert.equal(mailerSent.length, 0);
  });

  it('invalida tokens pendentes anteriores ao emitir um novo', async () => {
    const { register, request, resetStore } = makeCtx();
    const reg = await register({ email: EMAIL, password: PASSWORD });
    assert.equal(reg.ok, true);
    if (!reg.ok) return;

    await request({ email: EMAIL }); // hash-1
    await request({ email: EMAIL }); // hash-2; hash-1 deve ficar usado

    const unused = await resetStore.repository.findUnusedByUserId(reg.value.user.id);
    assert.equal(unused.ok, true);
    if (unused.ok) {
      assert.equal(unused.value.length, 1);
      assert.equal(unused.value[0]?.tokenHash, 'hash-2');
    }
  });
});
