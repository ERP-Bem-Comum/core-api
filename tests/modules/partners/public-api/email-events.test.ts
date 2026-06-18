/**
 * PARTNERS-INVITE-DOMAIN-EVENT — W0 (RED) — CA3: contrato publico do evento CollaboratorInvited.
 *
 * O `partners/public-api/email-events.ts` decodifica a row lida do `par_email_outbox` para o
 * evento de dominio de e-mail (`PartnersEmailEvent`). Payload AUTOCONTIDO (email, autocadastroUrl,
 * recipientName). Espelha `auth/public-api/email-events.ts`: schema_version=1, decoder versionado,
 * erros trataveis (sem throw). Payload corrupto / versao errada / eventType desconhecido -> err.
 *
 * DEVE FALHAR em W0: `partners/public-api/email-events.ts` ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  decodePartnersEmailEventV1,
  PARTNERS_EMAIL_SCHEMA_VERSION,
  type PartnersEmailOutboxRow,
} from '#src/modules/partners/public-api/email-events.ts';

const AT = new Date('2026-06-18T12:00:00.000Z');

const validRow = (over?: Partial<PartnersEmailOutboxRow>): PartnersEmailOutboxRow => ({
  eventType: 'CollaboratorInvited',
  schemaVersion: PARTNERS_EMAIL_SCHEMA_VERSION,
  payload: JSON.stringify({
    email: 'colaborador@example.com',
    autocadastroUrl: 'https://app.local/autocadastro?token=abc',
    recipientName: 'Fulano',
    occurredAt: AT.toISOString(),
  }),
  occurredAt: AT,
  ...over,
});

describe('decodePartnersEmailEventV1 (CA3)', () => {
  it('decodifica CollaboratorInvited com payload valido', () => {
    // Act
    const r = decodePartnersEmailEventV1(validRow());
    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.type, 'CollaboratorInvited');
      assert.equal(r.value.email, 'colaborador@example.com');
      assert.equal(r.value.autocadastroUrl, 'https://app.local/autocadastro?token=abc');
      assert.equal(r.value.recipientName, 'Fulano');
      assert.deepEqual(r.value.occurredAt, AT);
    }
  });

  it('payload corrupto (nao-JSON) -> erro tratavel (sem throw)', () => {
    const r = decodePartnersEmailEventV1(validRow({ payload: 'not-json{' }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.tag, 'PartnersEmailDecoderInvalidShape');
  });

  it('campo obrigatorio faltando -> InvalidShape', () => {
    const r = decodePartnersEmailEventV1(validRow({ payload: JSON.stringify({ email: 'x@y.z' }) }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.tag, 'PartnersEmailDecoderInvalidShape');
  });

  it('schema version divergente -> SchemaVersionMismatch', () => {
    const r = decodePartnersEmailEventV1(validRow({ schemaVersion: 999 }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.tag, 'PartnersEmailDecoderSchemaVersionMismatch');
  });

  it('eventType desconhecido -> UnknownEventType', () => {
    const r = decodePartnersEmailEventV1(validRow({ eventType: 'SomethingElse' }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.tag, 'PartnersEmailDecoderUnknownEventType');
  });
});
