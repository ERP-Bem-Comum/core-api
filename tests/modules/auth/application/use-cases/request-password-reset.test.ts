/**
 * CTR-AUTH-RESET-REQUEST — use case requestPasswordReset (BE-REC-003). ASCII puro.
 *
 * Anti-enumeracao: conta inexistente -> ok sem emitir evento. Conta ativa -> token novo + evento
 * PasswordResetRequested no auth_outbox (origem confiavel). Tokens pendentes anteriores sao
 * invalidados.
 *
 * NOTIF-EMAIL-EVENT-CONSUMER (fatia 02): o use case NAO chama mais mailer; o envio vem do consumidor
 * (worker email-dispatch). O teste verifica EMISSAO do evento, nao chamada sincrona de envio.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { requestPasswordReset } from '#src/modules/auth/application/use-cases/request-password-reset.ts';
import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryPasswordResetTokenStore } from '#src/modules/auth/adapters/persistence/repos/password-reset-token-repository.in-memory.ts';
import { InMemoryAuthOutbox } from '#src/modules/auth/adapters/outbox/auth-outbox.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import type { PasswordResetTokenMinter } from '#src/modules/auth/application/ports/password-reset-token-minter.ts';

const AT = new Date('2026-05-30T12:00:00.000Z');
const EMAIL = 'user@example.com';
const PASSWORD = 'Str0ng-Passphrase-2026!';
const BASE = 'https://app.local/reset';
const TTL = 900;

const makeCtx = () => {
  const userStore = makeInMemoryUserStore();
  const outbox = InMemoryAuthOutbox();
  const resetStore = makeInMemoryPasswordResetTokenStore(outbox.port);
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

  const request = requestPasswordReset({
    userReader: userStore.reader,
    resetTokenRepo: resetStore.repository,
    minter,
    clock: ClockFixed(AT),
    resetTtlSeconds: TTL,
    resetBaseUrl: BASE,
  });

  return { register, request, resetStore, outbox };
};

describe('requestPasswordReset (BE-REC-003)', () => {
  it('conta ativa -> emite token + evento PasswordResetRequested com origem confiável', async () => {
    const { register, request, resetStore, outbox } = makeCtx();
    await register({ email: EMAIL, password: PASSWORD });

    const r = await request({ email: EMAIL });
    assert.equal(r.ok, true);

    const rows = outbox.all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.eventType, 'PasswordResetRequested');
    const payload = JSON.parse(rows[0]?.payload ?? '{}') as Record<string, unknown>;
    assert.equal(payload['resetUrl'], `${BASE}?token=plain-1`);

    const persisted = await resetStore.repository.findByTokenHash('hash-1');
    assert.equal(persisted.ok, true);
    if (persisted.ok) assert.notEqual(persisted.value, null);
  });

  it('conta inexistente -> ok sem emitir evento (anti-enumeração)', async () => {
    const { request, outbox } = makeCtx();
    const r = await request({ email: 'ghost@example.com' });
    assert.equal(r.ok, true);
    assert.equal(outbox.all().length, 0);
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
