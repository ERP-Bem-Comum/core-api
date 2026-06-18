/**
 * NOTIF-INVITE-OUTBOX · W0 (RED) — partners CollaboratorInviteMailer ENFILEIRA (nao envia sincrono).
 *
 * Espelha o piloto password-reset-mailer.outbox.test.ts. O adapter de convite de autocadastro passa
 * a usar o EmailOutbox (entrega assincrona pelo worker) em vez de chamar EmailSender.send. Cobre:
 *   - CA2: sendInvite com e-mail valido -> enfileira UMA EmailMessage com o autocadastroUrl no corpo.
 *   - CA3: template preservado (subject + corpo texto/HTML + link de autocadastro).
 *   - CA4: reenfileirar o mesmo convite (mesma key derivada do token) -> sucesso, sem 2a linha.
 *   - borda do adapter: e-mail malformado -> nada enfileirado, retorna invite-mail-failed.
 *
 * DEVE FALHAR em W0 (makeOutboxCollaboratorInviteMailer inexistente). ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseEmailAddress } from '#src/modules/notifications/public-api/index.ts';
import { InMemoryEmailOutbox } from '#src/modules/notifications/adapters/outbox/email-outbox.in-memory.ts';
import { makeOutboxCollaboratorInviteMailer } from '#src/modules/partners/adapters/notifications/collaborator-invite-mailer.outbox.ts';

const AUTOCADASTRO_URL = 'https://app.local/autocadastro?token=collab-xyz789';

const fromAddr = () => {
  const r = parseEmailAddress('noreply@bemcomum.local');
  if (!r.ok) throw new Error('setup');
  return r.value;
};

describe('makeOutboxCollaboratorInviteMailer (partners)', () => {
  let store: ReturnType<typeof InMemoryEmailOutbox>;
  beforeEach(() => {
    store = InMemoryEmailOutbox();
  });

  it('CA2: e-mail valido -> enfileira uma EmailMessage com o link de autocadastro no corpo', async () => {
    const mailer = makeOutboxCollaboratorInviteMailer({
      emailOutbox: store.port,
      from: fromAddr(),
    });

    const r = await mailer.sendInvite({
      email: 'colab@example.com',
      autocadastroUrl: AUTOCADASTRO_URL,
      recipientName: 'Joao',
    });

    assert.equal(r.ok, true);
    const pending = store.pending();
    assert.equal(pending.length, 1);
    const row = pending[0];
    assert.ok(row !== undefined);
    if (row !== undefined) {
      assert.equal(row.processedAt, null);
      const parsed = JSON.parse(row.payload) as { textBody: string; to: readonly string[] };
      assert.deepEqual([...parsed.to], ['colab@example.com']);
      assert.ok(parsed.textBody.includes(AUTOCADASTRO_URL));
    }
  });

  it('CA3: template preservado -> subject + corpo texto e HTML de autocadastro', async () => {
    const mailer = makeOutboxCollaboratorInviteMailer({
      emailOutbox: store.port,
      from: fromAddr(),
    });

    const r = await mailer.sendInvite({
      email: 'colab@example.com',
      autocadastroUrl: AUTOCADASTRO_URL,
      recipientName: 'Joao',
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
      assert.equal(parsed.subject, 'Bem Comum - complete seu cadastro de colaborador');
      assert.ok(parsed.textBody.includes('Ola, Joao!'));
      assert.ok(parsed.htmlBody !== undefined);
      assert.ok(parsed.htmlBody?.includes(`<a href="${AUTOCADASTRO_URL}">`));
    }
  });

  it('CA3 (anti-XSS): recipientName escapado no HTML', async () => {
    const mailer = makeOutboxCollaboratorInviteMailer({
      emailOutbox: store.port,
      from: fromAddr(),
    });

    const r = await mailer.sendInvite({
      email: 'colab@example.com',
      autocadastroUrl: AUTOCADASTRO_URL,
      recipientName: '<b>x</b>',
    });
    assert.equal(r.ok, true);

    const row = store.pending()[0];
    assert.ok(row !== undefined);
    if (row !== undefined) {
      const parsed = JSON.parse(row.payload) as { htmlBody?: string };
      assert.ok(parsed.htmlBody?.includes('&lt;b&gt;x&lt;/b&gt;'));
      assert.ok(!parsed.htmlBody?.includes('<b>x</b>'));
    }
  });

  it('CA4: reenfileirar o mesmo convite (mesma key) -> sucesso, sem 2a linha', async () => {
    const mailer = makeOutboxCollaboratorInviteMailer({
      emailOutbox: store.port,
      from: fromAddr(),
    });
    const input = {
      email: 'colab@example.com',
      autocadastroUrl: AUTOCADASTRO_URL,
      recipientName: 'Joao',
    };

    const r1 = await mailer.sendInvite(input);
    const r2 = await mailer.sendInvite(input);

    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(store.all().length, 1);
  });

  it('borda: e-mail malformado -> nada enfileirado, retorna invite-mail-failed', async () => {
    const mailer = makeOutboxCollaboratorInviteMailer({
      emailOutbox: store.port,
      from: fromAddr(),
    });
    const r = await mailer.sendInvite({
      email: 'nao-e-email',
      autocadastroUrl: AUTOCADASTRO_URL,
      recipientName: 'Joao',
    });
    assert.equal(r.ok, false);
    assert.equal(store.all().length, 0);
  });
});
