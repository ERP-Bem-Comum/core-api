/**
 * NOTIF-EMAIL-EVENT-CONSUMER — W0 (RED) — CA5/CA7: corte do caminho antigo (sem duplicacao).
 *
 * Apos esta fatia, `requestPasswordReset` e `createUserByAdmin` NAO recebem mais `mailer`/
 * `inviteMailer` nem chamam envio sincrono. O e-mail sai SO pelo consumidor (worker). Aqui
 * provamos que:
 *   - CA5: os use cases sao construidos SEM dep de mailer (a dep some da assinatura);
 *   - CA7: o evento continua sendo emitido na tx (anti-enumeracao preservada);
 *   - nenhum envio sincrono ocorre (nao ha mailer para chamar).
 *
 * DEVE FALHAR em W0: hoje os factories EXIGEM `mailer`/`inviteMailer`; construir sem eles
 * e erro de tipo (typecheck) — e o objeto `deps` abaixo nao satisfaz a assinatura atual.
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { requestPasswordReset } from '#src/modules/auth/application/use-cases/request-password-reset.ts';
import { createUserByAdmin } from '#src/modules/auth/application/use-cases/create-user-by-admin.ts';
import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { makeInMemoryPasswordResetTokenStore } from '#src/modules/auth/adapters/persistence/repos/password-reset-token-repository.in-memory.ts';
import { InMemoryAuthOutbox } from '#src/modules/auth/adapters/outbox/auth-outbox.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import type { PasswordResetTokenMinter } from '#src/modules/auth/application/ports/password-reset-token-minter.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const AT = new Date('2026-06-18T12:00:00.000Z');
const EMAIL = 'user@example.com';
const PASSWORD = 'Str0ng-Passphrase-2026!';

const minter = (): PasswordResetTokenMinter => ({
  mint: () => ({ token: 'plain-1', tokenHash: 'hash-1' }),
  hash: (raw) => `${raw}-h`,
});

const unusableHash = (): PasswordHash.PasswordHash => {
  const h = PasswordHash.fromString('$argon2id$v=19$dummy-placeholder');
  if (!h.ok) throw new Error('setup');
  return h.value;
};

describe('CA5/CA7 — sem duplicacao de envio (corte do caminho antigo)', () => {
  it('requestPasswordReset emite o evento SEM dep de mailer', async () => {
    // Arrange
    const userStore = makeInMemoryUserStore();
    const outbox = InMemoryAuthOutbox();
    const resetStore = makeInMemoryPasswordResetTokenStore(outbox.port);
    const register = registerUser({
      userReader: userStore.reader,
      userRepo: userStore.repository,
      passwordHasher: makeFakePasswordHasher(),
      clock: ClockFixed(AT),
    });
    await register({ email: EMAIL, password: PASSWORD });

    // Construido SEM `mailer` — apos o corte a assinatura nao tem mais essa dep.
    const request = requestPasswordReset({
      userReader: userStore.reader,
      resetTokenRepo: resetStore.repository,
      minter: minter(),
      clock: ClockFixed(AT),
      resetTtlSeconds: 900,
      resetBaseUrl: 'https://app.local/reset',
    });

    // Act
    const r = await request({ email: EMAIL });

    // Assert: evento emitido (consumidor envia depois); nenhum envio sincrono.
    assert.equal(r.ok, true);
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.eventType, 'PasswordResetRequested');
  });

  it('createUserByAdmin emite o evento SEM dep de inviteMailer', async () => {
    // Arrange
    const userStore = makeInMemoryUserStore();
    const roleStore = makeInMemoryRoleStore();
    const outbox = InMemoryAuthOutbox();
    const resetStore = makeInMemoryPasswordResetTokenStore(outbox.port);

    // Construido SEM `inviteMailer` — apos o corte a assinatura nao tem mais essa dep.
    const create = createUserByAdmin({
      userReader: userStore.reader,
      userRepo: userStore.repository,
      roleRepo: roleStore.repository,
      resetTokenRepo: resetStore.repository,
      minter: minter(),
      clock: ClockFixed(AT),
      rbacMode: 'enforced',
      unusablePasswordHash: unusableHash(),
      inviteTtlSeconds: 604_800,
      activationBaseUrl: 'https://app.local/activate',
    });

    // Act
    const r = await create({
      adminId: UserId.generate(),
      name: 'Joana Silva',
      cpf: '52998224725',
      email: 'joana@example.com',
      telephone: '15997133502',
    });

    // Assert
    assert.equal(r.ok, true);
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.eventType, 'UserInvited');
  });
});
