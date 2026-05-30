/**
 * CTR-AUTH-RESET-MAILER-SMTP — adapter makeEmailPasswordResetMailer (BE-REC-003).
 *
 * Verifica que o adapter monta a EmailMessage (to/from/subject/corpo com o link) e delega ao
 * EmailSender (port de notifications). Usa um fake EmailSender inline. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { makeEmailPasswordResetMailer } from '#src/modules/auth/adapters/notifications/password-reset-mailer.email.ts';
import { parseEmailAddress } from '#src/modules/notifications/public-api/index.ts';
import type { EmailMessage, EmailSender } from '#src/modules/notifications/public-api/index.ts';

const RESET_URL = 'https://app.local/reset-password?token=abc123';

const makeFakeSender = () => {
  const sent: EmailMessage[] = [];
  const sender: EmailSender = {
    send: async (message) => {
      await Promise.resolve();
      sent.push(message);
      return ok({ messageId: 'fake-id', acceptedAt: '2026-05-30T12:00:00.000Z' });
    },
  };
  return { sender, sent };
};

const fromAddr = () => {
  const r = parseEmailAddress('noreply@bemcomum.local');
  if (!r.ok) throw new Error('setup');
  return r.value;
};

describe('makeEmailPasswordResetMailer', () => {
  it('monta a EmailMessage e envia pelo EmailSender (to, from, link no corpo)', async () => {
    const { sender, sent } = makeFakeSender();
    const mailer = makeEmailPasswordResetMailer({ emailSender: sender, from: fromAddr() });

    const r = await mailer.sendResetLink({ email: 'user@example.com', resetUrl: RESET_URL });

    assert.equal(r.ok, true);
    assert.equal(sent.length, 1);
    const msg = sent[0];
    assert.ok(msg !== undefined);
    if (msg !== undefined) {
      assert.equal(String(msg.to[0]), 'user@example.com');
      assert.equal(String(msg.from), 'noreply@bemcomum.local');
      assert.ok(msg.textBody.includes(RESET_URL));
    }
  });

  it('e-mail inválido -> reset-mail-failed (não envia)', async () => {
    const { sender, sent } = makeFakeSender();
    const mailer = makeEmailPasswordResetMailer({ emailSender: sender, from: fromAddr() });
    const r = await mailer.sendResetLink({ email: 'nao-e-email', resetUrl: RESET_URL });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reset-mail-failed');
    assert.equal(sent.length, 0);
  });

  it('falha do EmailSender -> reset-mail-failed', async () => {
    const failing: EmailSender = {
      send: async () => {
        await Promise.resolve();
        return err({ tag: 'transport-failed', reason: 'down' });
      },
    };
    const mailer = makeEmailPasswordResetMailer({ emailSender: failing, from: fromAddr() });
    const r = await mailer.sendResetLink({ email: 'user@example.com', resetUrl: RESET_URL });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reset-mail-failed');
  });
});
