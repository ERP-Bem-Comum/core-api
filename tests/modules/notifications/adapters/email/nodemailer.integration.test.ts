/**
 * W0 (RED) - Tests de integracao para createNodemailerEmailSender via Ethereal.
 *
 * Ticket: CTR-EMAIL-ADAPTER-NODEMAILER.
 *
 * Cobre CA-T7..T9:
 *   - T7: send com Ethereal account retorna ok(receipt), info.accepted tem 1 endereco
 *   - T8: send com recipient invalido retorna err invalid-recipient ou smtp-rejected
 *   - T9: SmtpConfig com host inexistente retorna err transport-failed
 *
 * Guarded por NOTIFICATIONS_INTEGRATION=1. Sem essa env, os tests sao skipped
 * silenciosamente (mas o IMPORT do adapter ainda quebra em W0, garantindo RED).
 *
 * Rodar:
 *   NOTIFICATIONS_INTEGRATION=1 node --test --experimental-strip-types \\
 *     'tests/modules/notifications/adapters/email/nodemailer.integration.test.ts'
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import nodemailer from 'nodemailer';

import { createNodemailerEmailSender } from '#src/modules/notifications/adapters/email/nodemailer.ts';
import type { SmtpConfig } from '#src/modules/notifications/adapters/email/nodemailer-config.ts';
import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts';
import * as EmailSubject from '#src/modules/notifications/domain/email/subject.ts';
import type { EmailMessage } from '#src/modules/notifications/domain/email/types.ts';

const integrationOn = process.env['NOTIFICATIONS_INTEGRATION'] === '1';

const makeMessage = (overrides: Partial<{ toRaw: string }> = {}): EmailMessage => {
  const fromR = EmailAddress.parse('sender@example.com');
  const toR = EmailAddress.parse(overrides.toRaw ?? 'rcpt@example.com');
  const subjR = EmailSubject.parse('Hello from integration test');
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

const etherealConfig = async (): Promise<SmtpConfig> => {
  const account = await nodemailer.createTestAccount();
  return {
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    user: account.user,
    pass: account.pass,
    pool: false, // integration test: connection unica
    maxConnections: 1,
    requireTLS: false, // Ethereal de teste: sem exigir STARTTLS
  };
};

describe('createNodemailerEmailSender (integration)', () => {
  if (!integrationOn) {
    it.skip('SKIP - NOTIFICATIONS_INTEGRATION=1 desligado', () => {
      // intencionalmente vazio: tests reais sao skipped quando integration nao esta ativa.
    });
    return;
  }

  it('CA-T7: send com Ethereal retorna ok(receipt) com messageId', async () => {
    // Arrange
    const config = await etherealConfig();
    const sender = createNodemailerEmailSender(config);

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

  it('CA-T8: recipient invalido retorna err tagged (invalid-recipient ou smtp-rejected)', async () => {
    // Arrange - construimos manualmente uma mensagem com to invalido
    // bypassing o smart constructor (que rejeitaria antes do SMTP).
    const config = await etherealConfig();
    const sender = createNodemailerEmailSender(config);
    const fromR = EmailAddress.parse('sender@example.com');
    const subjR = EmailSubject.parse('Test');
    if (!fromR.ok || !subjR.ok) throw new Error('fixture invalida');
    const badMessage = {
      from: fromR.value,
      // bypassa o brand para forcar invalido no SMTP layer
      to: [
        '@invalid' as unknown as ReturnType<typeof EmailAddress.parse> extends infer R
          ? R extends { ok: true; value: infer V }
            ? V
            : never
          : never,
      ],
      subject: subjR.value,
      textBody: 'corpo',
    } as EmailMessage;

    // Act
    const r = await sender.send(badMessage);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(
        r.error.tag === 'invalid-recipient' || r.error.tag === 'smtp-rejected',
        `tag esperado invalid-recipient|smtp-rejected; obtido: ${r.error.tag}`,
      );
    }
  });

  it('CA-T9: host inexistente retorna err transport-failed', async () => {
    // Arrange - config aponta para host invalido
    const config: SmtpConfig = {
      host: 'nonexistent.invalid.local',
      port: 587,
      secure: false,
      user: 'u',
      pass: 'p',
      pool: false,
      maxConnections: 1,
      requireTLS: false,
    };
    const sender = createNodemailerEmailSender(config);

    // Act
    const r = await sender.send(makeMessage());

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(
        r.error.tag,
        'transport-failed',
        `tag esperado transport-failed; obtido: ${r.error.tag}`,
      );
    }
  });
});
