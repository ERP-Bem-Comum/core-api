/**
 * NOTIF-EMAIL-EVENT-CONSUMER — W0 (RED) — CA1/CA3/CA6: worker email-dispatch end-to-end.
 *
 * O worker `email-dispatch` le o auth_outbox (via helpers do worker — CA1), decodifica o evento
 * (auth/public-api), entrega ao consumidor do notifications (EmailEventDelivery) e o `runOnce`
 * generico marca processed / retry / DLQ. Aqui exercitamos o fluxo COMPLETO sobre o InMemory:
 *   - sucesso -> markProcessed (sai do pending; e-mail enviado)
 *   - falha -> markFailed (segue pendente) ate maxAttempts -> moveToDeadLetter
 *
 * `buildEmailDispatchDelivery` e o seam do composition root (`src/workers/email-dispatch/delivery.ts`):
 * recebe um EmailSender e devolve o EventDelivery<OutboxRow> do notifications.
 *
 * DEVE FALHAR em W0: `src/workers/email-dispatch/delivery.ts` ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import { isOk } from '#src/shared/index.ts';
import { runOnce } from '#src/shared/outbox/index.ts';
import type { OutboxRow, RowToProcessed } from '#src/shared/outbox/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryAuthOutbox } from '#src/modules/auth/adapters/outbox/auth-outbox.in-memory.ts';
import type { OutboxMessage } from '#src/modules/auth/application/ports/outbox.ts';
import { createInMemoryEmailSender } from '#src/modules/notifications/adapters/email/in-memory.ts';
import { parseEmailAddress } from '#src/modules/notifications/public-api/index.ts';
import type { EmailSender } from '#src/modules/notifications/application/ports/email-sender.ts';
import { buildEmailDispatchDelivery } from '#src/workers/email-dispatch/delivery.ts';

const AT = new Date('2026-06-18T12:00:00.000Z');
const clock = ClockFixed(AT);

const identityRow: RowToProcessed<OutboxRow> = (r) => ({ ok: true, value: r });

const resetMessage = (eventId: string): OutboxMessage => ({
  eventId,
  aggregateId: 'user-1',
  aggregateType: 'User',
  eventType: 'PasswordResetRequested',
  occurredAt: AT,
  payload: JSON.stringify({
    email: 'user@example.com',
    resetUrl: 'https://app.local/reset?token=abc',
    occurredAt: AT.toISOString(),
  }),
});

const buildDelivery = (sender: EmailSender) => {
  const f = parseEmailAddress('no-reply@bemcomum.org');
  if (!f.ok) throw new Error('setup');
  return buildEmailDispatchDelivery({ emailSender: sender, from: f.value });
};

describe('email-dispatch worker (CA1/CA3/CA6)', () => {
  it('sucesso: claim -> envia -> markProcessed (sai do pending)', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([resetMessage('evt-1')]);
    const sender = createInMemoryEmailSender();
    const delivery = buildDelivery(sender);
    // Act
    const stats = await runOnce<OutboxRow>(
      { outbox, delivery, rowToProcessed: identityRow, clock, tag: '[email-dispatch-test] ' },
      { batchSize: 10, maxAttempts: 5, pollIntervalMs: 1 },
    );
    // Assert
    assert.equal(isOk(stats), true);
    if (stats.ok) assert.equal(stats.value.delivered, 1);
    assert.equal(sender.getSent().length, 1);
    assert.equal(outbox.pending().length, 0);
  });

  it('falha transitoria: markFailed, segue pendente (attempts incrementado)', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([resetMessage('evt-1')]);
    const failing: EmailSender = {
      send: () => Promise.resolve(err({ tag: 'transport-failed', reason: 'smtp-down' })),
    };
    const delivery = buildDelivery(failing);
    // Act
    const stats = await runOnce<OutboxRow>(
      { outbox, delivery, rowToProcessed: identityRow, clock, tag: '[email-dispatch-test] ' },
      { batchSize: 10, maxAttempts: 3, pollIntervalMs: 1 },
    );
    // Assert
    assert.equal(isOk(stats), true);
    if (stats.ok) assert.equal(stats.value.failed, 1);
    const pending = outbox.pending();
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.attempts, 1);
  });

  it('falha persistente: ao atingir maxAttempts -> moveToDeadLetter (sai do pending)', async () => {
    // Arrange: a row ja vem com attempts = maxAttempts-1; a proxima falha estoura o limite.
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([resetMessage('evt-1')]);
    outbox.setAttempts('evt-1', 2);
    const failing: EmailSender = {
      send: () => Promise.resolve(err({ tag: 'transport-failed', reason: 'smtp-down' })),
    };
    const delivery = buildDelivery(failing);
    // Act
    const stats = await runOnce<OutboxRow>(
      { outbox, delivery, rowToProcessed: identityRow, clock, tag: '[email-dispatch-test] ' },
      { batchSize: 10, maxAttempts: 3, pollIntervalMs: 1 },
    );
    // Assert
    assert.equal(isOk(stats), true);
    if (stats.ok) assert.equal(stats.value.movedToDeadLetter, 1);
    assert.equal(outbox.pending().length, 0);
  });
});
