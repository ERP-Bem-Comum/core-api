/**
 * W0 (RED) - Test de integracao para createResendEmailSender via API real do Resend.
 *
 * Ticket: CTR-EMAIL-ADAPTER-RESEND.
 *
 * Cobre CA-T5:
 *   - T5: send real (onboarding@resend.dev -> delivered@resend.dev) retorna ok(receipt)
 *         com messageId non-empty e acceptedAt ISO-8601.
 *
 * Usa o sandbox de teste do Resend (onboarding@resend.dev como from, delivered@resend.dev
 * como to) - funciona com qualquer API key valida, sem dominio verificado.
 *
 * Guarded por NOTIFICATIONS_INTEGRATION=1 + RESEND_API_KEY. Sem ambas, skipped
 * silenciosamente (mas o IMPORT do adapter ainda quebra em W0, garantindo RED).
 *
 * Rodar:
 *   NOTIFICATIONS_INTEGRATION=1 RESEND_API_KEY=re_... node --test \\
 *     --experimental-strip-types \\
 *     'tests/modules/notifications/adapters/email/resend.integration.test.ts'
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createResendEmailSender } from '#src/modules/notifications/adapters/email/resend.ts';
import { parseResendConfig } from '#src/modules/notifications/adapters/email/resend-config.ts';
import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts';
import * as EmailSubject from '#src/modules/notifications/domain/email/subject.ts';
import type { EmailMessage } from '#src/modules/notifications/domain/email/types.ts';

const integrationOn =
  process.env['NOTIFICATIONS_INTEGRATION'] === '1' && (process.env['RESEND_API_KEY'] ?? '') !== '';

const makeMessage = (): EmailMessage => {
  const fromR = EmailAddress.parse('onboarding@resend.dev');
  const toR = EmailAddress.parse('delivered@resend.dev');
  const subjR = EmailSubject.parse('Hello from Resend integration test');
  if (!fromR.ok || !toR.ok || !subjR.ok) {
    throw new Error('fixture invalida');
  }
  return {
    from: fromR.value,
    to: [toR.value],
    subject: subjR.value,
    textBody: 'corpo de teste',
  };
};

describe('createResendEmailSender (integration)', () => {
  if (!integrationOn) {
    it.skip('SKIP - NOTIFICATIONS_INTEGRATION=1 + RESEND_API_KEY ausentes', () => {
      // intencionalmente vazio: tests reais sao skipped quando integration nao esta ativa.
    });
    return;
  }

  it('CA-T5: send real retorna ok(receipt) com messageId UUID', async () => {
    // Arrange
    const configR = parseResendConfig(process.env);
    assert.equal(configR.ok, true);
    if (!configR.ok) return;
    const sender = createResendEmailSender(configR.value);

    // Act
    const r = await sender.send(makeMessage());

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.ok(r.value.messageId.length > 0, 'messageId deve ser non-empty');
      assert.match(
        r.value.acceptedAt,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        `acceptedAt deve ser ISO-8601; obtido: ${r.value.acceptedAt}`,
      );
    }
  });
});
