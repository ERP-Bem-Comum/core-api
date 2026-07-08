/**
 * NOTIF-EMAIL-EVENT-CONSUMER — W0 (RED) — CA3/CA4/CA6/CA8: consumidor de eventos de e-mail.
 *
 * O `notifications` consome (via auth/public-api, ADR-0006) o evento decodificado e:
 *   - CA3: PasswordResetRequested -> template de reset (link) -> EmailSender.send
 *   - CA4: UserInvited -> template de convite (link + nome) -> EmailSender.send
 *   - CA8: conteudo equivalente ao mailer atual; escapeHtml no nome (anti-XSS)
 *   - CA6: falha do EmailSender -> err (DeliveryError) -> worker faz retry/DLQ
 *
 * O delivery e `EventDelivery<OutboxRow>`: recebe a row crua, decodifica via auth/public-api,
 * mapeia para EmailMessage e envia. Payload corrupto / eventType fora do contrato -> err
 * (o worker generico roteia para DLQ).
 *
 * DEVE FALHAR em W0: `email-event-delivery.ts` ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import { isOk } from '#src/shared/index.ts';
import type { OutboxRow } from '#src/shared/outbox/index.ts';
import { createInMemoryEmailSender } from '#src/modules/notifications/adapters/email/in-memory.ts';
import type { EmailSender } from '#src/modules/notifications/application/ports/email-sender.ts';
import { parseEmailAddress } from '#src/modules/notifications/public-api/index.ts';
import { createEmailEventDelivery } from '#src/modules/notifications/adapters/event-delivery/email-event-delivery.ts';

const AT = new Date('2026-06-18T12:00:00.000Z');

const from = (): ReturnType<typeof parseEmailAddress> => parseEmailAddress('no-reply@bemcomum.org');

const row = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  eventId: 'evt-1',
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
  ...over,
});

const inviteRow = (over: Partial<OutboxRow> = {}): OutboxRow =>
  row({
    eventId: 'evt-2',
    eventType: 'UserInvited',
    payload: JSON.stringify({
      email: 'joana@example.com',
      activationUrl: 'https://app.local/activate?token=xyz',
      recipientName: '<b>Joana</b> Silva',
      occurredAt: AT.toISOString(),
    }),
    ...over,
  });

const makeDelivery = (sender: EmailSender) => {
  const f = from();
  if (!f.ok) throw new Error('setup: from invalido');
  return createEmailEventDelivery({ emailSender: sender, from: f.value });
};

describe('notifications EmailEventDelivery (CA3/CA4/CA6/CA8)', () => {
  it('CA5 [#133] — rate-limited do sender -> deliver retorna ok (descarte anti-flood, nao retry/DLQ)', async () => {
    const sender: EmailSender = {
      send: () => Promise.resolve(err({ tag: 'rate-limited', reason: 'over per-window limit' })),
    };
    const delivery = makeDelivery(sender);
    const r = await delivery.deliver(row());
    assert.equal(
      isOk(r),
      true,
      'rate-limited deve ser PROCESSADO (ok), nao DeliveryError (retry/DLQ)',
    );
  });

  it('CA3 — PasswordResetRequested -> envia e-mail de reset com o link e marca ok', async () => {
    // Arrange
    const sender = createInMemoryEmailSender();
    const delivery = makeDelivery(sender);
    // Act
    const r = await delivery.deliver(row());
    // Assert
    assert.equal(isOk(r), true);
    const sent = sender.getSent();
    assert.equal(sent.length, 1);
    assert.equal(String(sent[0]?.to[0]), 'user@example.com');
    assert.ok(sent[0]?.textBody.includes('https://app.local/reset?token=abc'));
  });

  it('CA4 — UserInvited -> envia e-mail de convite com link + nome', async () => {
    // Arrange
    const sender = createInMemoryEmailSender();
    const delivery = makeDelivery(sender);
    // Act
    const r = await delivery.deliver(inviteRow());
    // Assert
    assert.equal(isOk(r), true);
    const sent = sender.getSent();
    assert.equal(sent.length, 1);
    assert.equal(String(sent[0]?.to[0]), 'joana@example.com');
    assert.ok(sent[0]?.textBody.includes('https://app.local/activate?token=xyz'));
  });

  it('CA8 — convite: nome escapado no HTML (anti-XSS) e link presente', async () => {
    // Arrange
    const sender = createInMemoryEmailSender();
    const delivery = makeDelivery(sender);
    // Act
    await delivery.deliver(inviteRow());
    // Assert
    const html = sender.getSent()[0]?.htmlBody ?? '';
    assert.ok(html.includes('&lt;b&gt;Joana&lt;/b&gt; Silva'), `html sem escape: ${html}`);
    assert.equal(html.includes('<b>Joana</b>'), false); // tag bruta nunca aparece
  });

  it('CA6 — falha do EmailSender -> err (DeliveryError -> worker faz retry/DLQ)', async () => {
    // Arrange: sender que sempre falha (transport-failed).
    const failing: EmailSender = {
      send: () => Promise.resolve(err({ tag: 'transport-failed', reason: 'smtp-down' })),
    };
    const delivery = makeDelivery(failing);
    // Act
    const r = await delivery.deliver(row());
    // Assert
    assert.equal(r.ok, false);
  });

  it('payload corrupto -> err (worker roteia para DLQ)', async () => {
    // Arrange
    const sender = createInMemoryEmailSender();
    const delivery = makeDelivery(sender);
    // Act
    const r = await delivery.deliver(row({ payload: '{ not json' }));
    // Assert
    assert.equal(r.ok, false);
    assert.equal(sender.getSent().length, 0);
  });

  it('eventType fora do contrato -> err, sem envio', async () => {
    // Arrange
    const sender = createInMemoryEmailSender();
    const delivery = makeDelivery(sender);
    // Act
    const r = await delivery.deliver(row({ eventType: 'UserDeleted' }));
    // Assert
    assert.equal(r.ok, false);
    assert.equal(sender.getSent().length, 0);
  });

  it('consumerId identifica o consumer de e-mail', () => {
    const sender = createInMemoryEmailSender();
    const delivery = makeDelivery(sender);
    assert.equal(typeof delivery.consumerId, 'string');
    assert.ok(delivery.consumerId.length > 0);
  });
});
