/**
 * PARTNERS-INVITE-DOMAIN-EVENT — W0 (RED) — CA4/CA7: delivery multi-fonte do email-dispatch.
 *
 * O MESMO `EventDelivery` de e-mail (createEmailEventDelivery) passa a entregar tambem o evento
 * `CollaboratorInvited` (lido do par_email_outbox): decodifica via partners/public-api -> template
 * de autocadastro (texto/HTML com escapeHtml) -> EmailSender.send (CA4). Os eventos do auth_outbox
 * (PasswordResetRequested/UserInvited) continuam sendo entregues pela MESMA instancia (CA7).
 *
 * DEVE FALHAR em W0: a delivery ainda so decodifica eventos do auth (nao conhece CollaboratorInvited).
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { OutboxRow } from '#src/shared/outbox/index.ts';
import { createEmailEventDelivery } from '#src/modules/notifications/public-api/index.ts';
import { parseEmailAddress } from '#src/modules/notifications/public-api/index.ts';
import { createInMemoryEmailSender } from '#src/modules/notifications/adapters/email/in-memory.ts';

const AT = new Date('2026-06-18T12:00:00.000Z');

const from = () => {
  const f = parseEmailAddress('no-reply@bemcomum.org');
  if (!f.ok) throw new Error('setup');
  return f.value;
};

const collaboratorInvitedRow = (over?: Partial<OutboxRow>): OutboxRow => ({
  eventId: 'evt-1',
  aggregateId: 'collab-1',
  aggregateType: 'Collaborator',
  eventType: 'CollaboratorInvited',
  schemaVersion: 1,
  occurredAt: AT,
  enqueuedAt: AT,
  processedAt: null,
  attempts: 0,
  payload: JSON.stringify({
    email: 'colaborador@example.com',
    autocadastroUrl: 'https://app.local/autocadastro?token=abc',
    recipientName: 'Fulano <script>',
    occurredAt: AT.toISOString(),
  }),
  ...over,
});

const passwordResetRow = (): OutboxRow => ({
  eventId: 'evt-2',
  aggregateId: 'user-1',
  aggregateType: 'User',
  eventType: 'PasswordResetRequested',
  schemaVersion: 1,
  occurredAt: AT,
  enqueuedAt: AT,
  processedAt: null,
  attempts: 0,
  payload: JSON.stringify({
    email: 'user@example.com',
    resetUrl: 'https://app.local/reset?token=abc',
    occurredAt: AT.toISOString(),
  }),
});

describe('createEmailEventDelivery multi-fonte (CA4/CA7)', () => {
  it('CA4 — CollaboratorInvited: monta o e-mail de autocadastro e envia', async () => {
    const sender = createInMemoryEmailSender();
    const delivery = createEmailEventDelivery({ emailSender: sender, from: from() });
    const r = await delivery.deliver(collaboratorInvitedRow());
    assert.equal(r.ok, true);
    const sent = sender.getSent();
    assert.equal(sent.length, 1);
    // o link de autocadastro deve estar no corpo do e-mail
    assert.equal(sent[0]?.textBody.includes('https://app.local/autocadastro?token=abc'), true);
    // anti-XSS: o nome do destinatario e escapado no HTML
    if (sent[0]?.htmlBody !== undefined) {
      assert.equal(sent[0].htmlBody.includes('<script>'), false);
    }
  });

  it('CA7 — a MESMA delivery continua entregando PasswordResetRequested (auth_outbox)', async () => {
    const sender = createInMemoryEmailSender();
    const delivery = createEmailEventDelivery({ emailSender: sender, from: from() });
    const r = await delivery.deliver(passwordResetRow());
    assert.equal(r.ok, true);
    assert.equal(sender.getSent().length, 1);
  });

  it('CA3 — payload de CollaboratorInvited corrupto -> erro tratavel (sem throw)', async () => {
    const sender = createInMemoryEmailSender();
    const delivery = createEmailEventDelivery({ emailSender: sender, from: from() });
    const r = await delivery.deliver(collaboratorInvitedRow({ payload: 'corrupt{' }));
    assert.equal(r.ok, false);
    assert.equal(sender.getSent().length, 0);
  });
});
