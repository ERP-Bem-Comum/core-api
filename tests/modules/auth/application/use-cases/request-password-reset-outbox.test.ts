/**
 * AUTH-DOMAIN-OUTBOX — W0 (RED) — emissao atomica de PasswordResetRequested (CA2/CA4/CA5).
 *
 * O save do reset-token e o append do evento PasswordResetRequested ocorrem na MESMA
 * transacao (atomicidade — ADR-0015). Anti-enumeracao preservada (CA4): conta inexistente/
 * malformada/inativa NAO emite evento. Rollback (CA5): falha no save => nenhum evento.
 *
 * DEVE FALHAR em W0: requestPasswordReset ainda nao recebe outbox nem grava o evento na tx.
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { requestPasswordReset } from '#src/modules/auth/application/use-cases/request-password-reset.ts';
import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryPasswordResetTokenStore } from '#src/modules/auth/adapters/persistence/repos/password-reset-token-repository.in-memory.ts';
import { InMemoryAuthOutbox } from '#src/modules/auth/adapters/outbox/auth-outbox.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import type { PasswordResetTokenMinter } from '#src/modules/auth/application/ports/password-reset-token-minter.ts';
import type { PasswordResetMailer } from '#src/modules/auth/application/ports/password-reset-mailer.ts';

const AT = new Date('2026-05-30T12:00:00.000Z');
const EMAIL = 'user@example.com';
const PASSWORD = 'Str0ng-Passphrase-2026!';
const BASE = 'https://app.local/reset';
const TTL = 900;

const makeCtx = (over?: {
  resetStore?: ReturnType<typeof makeInMemoryPasswordResetTokenStore>;
  outbox?: ReturnType<typeof InMemoryAuthOutbox>;
}) => {
  const userStore = makeInMemoryUserStore();
  const outbox = over?.outbox ?? InMemoryAuthOutbox();
  // O outbox e INJETADO no store: a atomicidade (save token + append evento) e coordenada
  // pelo adapter de persistencia (saveWithEvents), nao pelo use case (ports-and-adapters).
  const resetStore = over?.resetStore ?? makeInMemoryPasswordResetTokenStore(outbox.port);
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

  return { register, request, resetStore, outbox, mailerSent };
};

describe('requestPasswordReset emite PasswordResetRequested na tx (CA2/CA4/CA5)', () => {
  it('CA2 — conta ativa: grava o evento PasswordResetRequested no outbox', async () => {
    // Arrange
    const { register, request, outbox } = makeCtx();
    await register({ email: EMAIL, password: PASSWORD });
    // Act
    const r = await request({ email: EMAIL });
    // Assert
    assert.equal(r.ok, true);
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.eventType, 'PasswordResetRequested');
    assert.equal(rows[0]?.aggregateType, 'User');
  });

  it('CA7 — o evento carrega destinatario + link do reset (payload autocontido)', async () => {
    // Arrange
    const { register, request, outbox } = makeCtx();
    await register({ email: EMAIL, password: PASSWORD });
    // Act
    await request({ email: EMAIL });
    // Assert
    const payload = JSON.parse(outbox.all()[0]?.payload ?? '{}') as Record<string, unknown>;
    assert.equal(payload['email'], EMAIL);
    assert.equal(payload['resetUrl'], `${BASE}?token=plain-1`);
  });

  it('CA4 — conta inexistente: nenhum evento e gravado (anti-enumeracao)', async () => {
    // Arrange
    const { request, outbox, mailerSent } = makeCtx();
    // Act
    const r = await request({ email: 'ghost@example.com' });
    // Assert
    assert.equal(r.ok, true);
    assert.equal(outbox.all().length, 0);
    assert.equal(mailerSent.length, 0);
  });

  it('CA4 — email malformado: nenhum evento (anti-enumeracao)', async () => {
    // Arrange
    const { request, outbox } = makeCtx();
    // Act
    const r = await request({ email: 'not-an-email' });
    // Assert
    assert.equal(r.ok, true);
    assert.equal(outbox.all().length, 0);
  });

  it('CA5 — falha no save do token: rollback total, nenhum evento orfao', async () => {
    // Arrange: store cujo saveWithEvents falha => nem token nem evento devem persistir.
    const failingStore = makeInMemoryPasswordResetTokenStore();
    const inner = failingStore.repository.saveWithEvents;
    assert.equal(typeof inner, 'function', 'saveWithEvents deve existir no port');
    // Substitui por uma versao que sempre falha (simula erro de infra na tx).
    (failingStore.repository as { saveWithEvents: unknown }).saveWithEvents = () =>
      Promise.resolve(err('password-reset-token-repo-unavailable'));

    const { register, request, outbox } = makeCtx({ resetStore: failingStore });
    await register({ email: EMAIL, password: PASSWORD });
    // Act
    const r = await request({ email: EMAIL });
    // Assert: o use case propaga o erro e NENHUM evento foi gravado (atomicidade).
    assert.equal(r.ok, false);
    assert.equal(outbox.all().length, 0);
  });
});
