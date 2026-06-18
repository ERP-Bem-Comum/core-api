/**
 * NOTIF-INVITE-OUTBOX · W0 (RED) — auth InviteMailer ENFILEIRA (nao envia sincrono).
 *
 * Espelha o piloto password-reset-mailer.outbox.test.ts. O adapter de convite passa a usar o
 * EmailOutbox (entrega assincrona pelo worker) em vez de chamar EmailSender.send no request. Cobre:
 *   - CA1: sendInvite com e-mail valido -> enfileira UMA EmailMessage com o activationUrl no corpo.
 *   - CA3: template preservado (subject + corpo texto/HTML + link de ativacao).
 *   - CA4: reenfileirar o mesmo convite (mesma key derivada do token) -> sucesso, sem 2a linha.
 *   - borda do adapter: e-mail malformado -> nada enfileirado, retorna invite-mail-failed.
 *
 * DEVE FALHAR em W0 (makeOutboxInviteMailer inexistente). ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseEmailAddress } from '#src/modules/notifications/public-api/index.ts';
import { InMemoryEmailOutbox } from '#src/modules/notifications/adapters/outbox/email-outbox.in-memory.ts';
import { makeOutboxInviteMailer } from '#src/modules/auth/adapters/notifications/invite-mailer.outbox.ts';

const ACTIVATION_URL = 'https://app.local/activate?token=invite-abc123';

const fromAddr = () => {
  const r = parseEmailAddress('noreply@bemcomum.local');
  if (!r.ok) throw new Error('setup');
  return r.value;
};

describe('makeOutboxInviteMailer (auth)', () => {
  let store: ReturnType<typeof InMemoryEmailOutbox>;
  beforeEach(() => {
    store = InMemoryEmailOutbox();
  });

  it('CA1: e-mail valido -> enfileira uma EmailMessage com o link de ativacao no corpo', async () => {
    const mailer = makeOutboxInviteMailer({ emailOutbox: store.port, from: fromAddr() });

    const r = await mailer.sendInvite({
      email: 'user@example.com',
      activationUrl: ACTIVATION_URL,
      recipientName: 'Maria',
    });

    assert.equal(r.ok, true);
    const pending = store.pending();
    assert.equal(pending.length, 1);
    const row = pending[0];
    assert.ok(row !== undefined);
    if (row !== undefined) {
      assert.equal(row.processedAt, null);
      const parsed = JSON.parse(row.payload) as {
        subject: string;
        textBody: string;
        htmlBody?: string;
        to: readonly string[];
      };
      assert.deepEqual([...parsed.to], ['user@example.com']);
      assert.ok(parsed.textBody.includes(ACTIVATION_URL));
    }
  });

  it('CA3: template preservado -> subject + corpo texto e HTML do convite de ativacao', async () => {
    const mailer = makeOutboxInviteMailer({ emailOutbox: store.port, from: fromAddr() });

    const r = await mailer.sendInvite({
      email: 'user@example.com',
      activationUrl: ACTIVATION_URL,
      recipientName: 'Maria',
    });
    assert.equal(r.ok, true);

    const row = store.pending()[0];
    assert.ok(row !== undefined);
    if (row !== undefined) {
      const parsed = JSON.parse(row.payload) as {
        subject: string;
        textBody: string;
        htmlBody?: string;
      };
      assert.equal(parsed.subject, 'Bem-vindo ao Bem Comum - ative seu acesso');
      assert.ok(parsed.textBody.includes('Ola, Maria!'));
      assert.ok(parsed.htmlBody !== undefined);
      assert.ok(parsed.htmlBody?.includes(`<a href="${ACTIVATION_URL}">`));
    }
  });

  it('CA3 (anti-XSS): recipientName escapado no HTML', async () => {
    const mailer = makeOutboxInviteMailer({ emailOutbox: store.port, from: fromAddr() });

    const r = await mailer.sendInvite({
      email: 'user@example.com',
      activationUrl: ACTIVATION_URL,
      recipientName: '<script>',
    });
    assert.equal(r.ok, true);

    const row = store.pending()[0];
    assert.ok(row !== undefined);
    if (row !== undefined) {
      const parsed = JSON.parse(row.payload) as { htmlBody?: string };
      assert.ok(parsed.htmlBody?.includes('&lt;script&gt;'));
      assert.ok(!parsed.htmlBody?.includes('<script>'));
    }
  });

  it('CA4: reenfileirar o mesmo convite (mesma key) -> sucesso, sem 2a linha', async () => {
    const mailer = makeOutboxInviteMailer({ emailOutbox: store.port, from: fromAddr() });
    const input = {
      email: 'user@example.com',
      activationUrl: ACTIVATION_URL,
      recipientName: 'Maria',
    };

    const r1 = await mailer.sendInvite(input);
    const r2 = await mailer.sendInvite(input);

    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(store.all().length, 1);
  });

  it('borda: e-mail malformado -> nada enfileirado, retorna invite-mail-failed', async () => {
    const mailer = makeOutboxInviteMailer({ emailOutbox: store.port, from: fromAddr() });
    const r = await mailer.sendInvite({
      email: 'nao-e-email',
      activationUrl: ACTIVATION_URL,
      recipientName: 'Maria',
    });
    assert.equal(r.ok, false);
    assert.equal(store.all().length, 0);
  });
});
