/**
 * AUTH-DOMAIN-OUTBOX — W0 (RED) — emissao atomica de UserInvited (CA3/CA5).
 *
 * createUserByAdmin grava user + invite-token + UserInvited na MESMA tx (atomicidade —
 * ADR-0015). O evento carrega destinatario + link de ativacao + nome (CA7). Rollback (CA5):
 * falha no save do token => nenhum evento. DEVE FALHAR em W0: o use case ainda nao recebe
 * outbox nem grava o evento. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import { createUserByAdmin } from '#src/modules/auth/application/use-cases/create-user-by-admin.ts';
import type { PasswordResetTokenMinter } from '#src/modules/auth/application/ports/password-reset-token-minter.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { makeInMemoryPasswordResetTokenStore } from '#src/modules/auth/adapters/persistence/repos/password-reset-token-repository.in-memory.ts';
import { InMemoryAuthOutbox } from '#src/modules/auth/adapters/outbox/auth-outbox.in-memory.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const AT = new Date('2026-06-07T12:00:00.000Z');
const TTL = 604_800;
const BASE_URL = 'https://app.example.com/primeiro-acesso';
const ADMIN_ID = UserId.generate();

const unusableHash = (): PasswordHash.PasswordHash => {
  const h = PasswordHash.fromString('$argon2id$v=19$dummy-placeholder');
  if (!h.ok) throw new Error('setup');
  return h.value;
};

const makeCtx = (over?: {
  resetStore?: ReturnType<typeof makeInMemoryPasswordResetTokenStore>;
  outbox?: ReturnType<typeof InMemoryAuthOutbox>;
}) => {
  const userStore = makeInMemoryUserStore();
  const roleStore = makeInMemoryRoleStore();
  const outbox = over?.outbox ?? InMemoryAuthOutbox();
  // Outbox INJETADO no store: a atomicidade user+invite-token+evento e coordenada pelo
  // adapter de persistencia (saveWithEvents), nao pelo use case (ports-and-adapters).
  const resetStore = over?.resetStore ?? makeInMemoryPasswordResetTokenStore(outbox.port);

  const minter: PasswordResetTokenMinter = {
    mint: () => ({ token: 'plain-token-xyz', tokenHash: 'hash-xyz' }),
    hash: (raw) => `hash-of-${raw}`,
  };

  // NOTIF-EMAIL-EVENT-CONSUMER (fatia 02): o use case nao recebe mais inviteMailer; o envio
  // do convite e do consumidor. O evento UserInvited continua emitido na tx (saveWithEvents).
  const create = createUserByAdmin({
    userReader: userStore.reader,
    userRepo: userStore.repository,
    roleRepo: roleStore.repository,
    resetTokenRepo: resetStore.repository,
    minter,
    clock: ClockFixed(AT),
    rbacMode: 'enforced',
    unusablePasswordHash: unusableHash(),
    inviteTtlSeconds: TTL,
    activationBaseUrl: BASE_URL,
  });

  return { create, outbox, resetStore };
};

const CMD = {
  adminId: ADMIN_ID,
  name: 'Joana Silva',
  cpf: '52998224725',
  email: 'joana@example.com',
  telephone: '15997133502',
} as const;

describe('createUserByAdmin emite UserInvited na tx (CA3/CA5/CA7)', () => {
  it('CA3 — grava o evento UserInvited no outbox', async () => {
    // Arrange
    const { create, outbox } = makeCtx();
    // Act
    const r = await create(CMD);
    // Assert
    assert.equal(r.ok, true);
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.eventType, 'UserInvited');
  });

  it('CA7 — o evento carrega destinatario + link de ativacao + nome', async () => {
    // Arrange
    const { create, outbox } = makeCtx();
    // Act
    await create(CMD);
    // Assert
    const payload = JSON.parse(outbox.all()[0]?.payload ?? '{}') as Record<string, unknown>;
    assert.equal(payload['email'], CMD.email);
    assert.equal(payload['activationUrl'], `${BASE_URL}?token=plain-token-xyz`);
    assert.equal(payload['recipientName'], CMD.name);
  });

  it('CA5 — falha no save do invite-token: rollback, nenhum evento orfao', async () => {
    // Arrange
    const failingStore = makeInMemoryPasswordResetTokenStore();
    assert.equal(
      typeof failingStore.repository.saveWithEvents,
      'function',
      'saveWithEvents deve existir no port',
    );
    (failingStore.repository as { saveWithEvents: unknown }).saveWithEvents = () =>
      Promise.resolve(err('password-reset-token-repo-unavailable'));
    const { create, outbox } = makeCtx({ resetStore: failingStore });
    // Act
    const r = await create(CMD);
    // Assert
    assert.equal(r.ok, false);
    assert.equal(outbox.all().length, 0);
  });
});
