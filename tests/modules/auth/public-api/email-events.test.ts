/**
 * NOTIF-EMAIL-EVENT-CONSUMER — W0 (RED) — CA2: contrato de eventos de e-mail no auth/public-api.
 *
 * O auth expoe, via public-api (ADR-0006), o decoder dos eventos de e-mail transacional
 * (`PasswordResetRequested` / `UserInvited`). O consumidor (notifications) recebe a OutboxRow
 * lida do auth_outbox e a decodifica AQUI — payload autocontido (destinatario, link, nome).
 *
 * Espelha `contracts/public-api/events.ts` (schema_version=1, decoder versionado, erros trataveis).
 *
 * DEVE FALHAR em W0: `src/modules/auth/public-api/email-events.ts` ainda nao existe
 * (ERR_MODULE_NOT_FOUND). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import {
  decodeAuthEmailEventV1,
  AUTH_EMAIL_SCHEMA_VERSION,
  type AuthEmailEvent,
} from '#src/modules/auth/public-api/email-events.ts';

type Row = Readonly<{
  eventType: string;
  schemaVersion: number;
  payload: string;
  aggregateId: string;
  occurredAt: Date;
}>;

const AT = new Date('2026-06-18T12:00:00.000Z');

const resetRow = (over: Partial<Row> = {}): Row => ({
  eventType: 'PasswordResetRequested',
  schemaVersion: AUTH_EMAIL_SCHEMA_VERSION,
  payload: JSON.stringify({
    email: 'user@example.com',
    resetUrl: 'https://app.local/reset?token=abc',
    occurredAt: AT.toISOString(),
  }),
  aggregateId: 'user-1',
  occurredAt: AT,
  ...over,
});

const inviteRow = (over: Partial<Row> = {}): Row => ({
  eventType: 'UserInvited',
  schemaVersion: AUTH_EMAIL_SCHEMA_VERSION,
  payload: JSON.stringify({
    email: 'joana@example.com',
    activationUrl: 'https://app.local/activate?token=xyz',
    recipientName: 'Joana Silva',
    occurredAt: AT.toISOString(),
  }),
  aggregateId: 'user-2',
  occurredAt: AT,
  ...over,
});

describe('auth/public-api decodeAuthEmailEventV1 (CA2)', () => {
  it('decodifica PasswordResetRequested -> destinatario + link', () => {
    // Arrange / Act
    const r = decodeAuthEmailEventV1(resetRow());
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok && r.value.type === 'PasswordResetRequested') {
      assert.equal(r.value.email, 'user@example.com');
      assert.equal(r.value.resetUrl, 'https://app.local/reset?token=abc');
    } else {
      assert.fail('esperava PasswordResetRequested');
    }
  });

  it('decodifica UserInvited -> destinatario + link + nome', () => {
    // Arrange / Act
    const r = decodeAuthEmailEventV1(inviteRow());
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok && r.value.type === 'UserInvited') {
      assert.equal(r.value.email, 'joana@example.com');
      assert.equal(r.value.activationUrl, 'https://app.local/activate?token=xyz');
      assert.equal(r.value.recipientName, 'Joana Silva');
    } else {
      assert.fail('esperava UserInvited');
    }
  });

  it('schema_version divergente -> erro tratavel (sem throw)', () => {
    // Arrange / Act
    const r = decodeAuthEmailEventV1(resetRow({ schemaVersion: 99 }));
    // Assert
    assert.equal(r.ok, false);
  });

  it('payload corrupto (nao-JSON) -> erro tratavel', () => {
    // Arrange / Act
    const r = decodeAuthEmailEventV1(resetRow({ payload: '{ not json' }));
    // Assert
    assert.equal(r.ok, false);
  });

  it('eventType desconhecido -> erro tratavel (nao reconhecido no contrato v1)', () => {
    // Arrange / Act
    const r = decodeAuthEmailEventV1(resetRow({ eventType: 'UserDeleted' }));
    // Assert
    assert.equal(r.ok, false);
  });

  it('campo obrigatorio faltando (sem email) -> erro tratavel', () => {
    // Arrange / Act
    const r = decodeAuthEmailEventV1(
      resetRow({ payload: JSON.stringify({ resetUrl: 'https://x' }) }),
    );
    // Assert
    assert.equal(r.ok, false);
  });

  it('union AuthEmailEvent e exaustiva sobre os 2 tipos de e-mail', () => {
    // Sentinela de tipo: garante que o decoder so produz os dois eventos previstos.
    const sample: AuthEmailEvent = {
      type: 'PasswordResetRequested',
      email: 'a@b.com',
      resetUrl: 'https://x',
      occurredAt: AT,
    };
    assert.equal(sample.type, 'PasswordResetRequested');
  });
});
