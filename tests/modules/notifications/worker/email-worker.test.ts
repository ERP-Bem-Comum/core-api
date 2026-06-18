/**
 * NOTIF-EMAIL-OUTBOX · W0 (RED) — worker de e-mail (integracao com EmailSender fake).
 *
 * Usa o adapter InMemory do EmailOutbox como WorkerOutboxOps + um EmailSender fake
 * (configuravel: aceita, falha, conta chamadas). Sem DB — roda no `pnpm test` puro.
 *
 * Cobre:
 *   - CA3: delivery ok -> EmailSender.send chamado com a EmailMessage desserializada
 *          e linha marcada processed (processedAt != null).
 *   - CA4: delivery falha e attempts+1 < maxAttempts -> markFailed (attempts++), pendente.
 *   - CA5: delivery falha e attempts+1 >= maxAttempts -> dead-letter (nao re-tentada).
 *   - CA6: payload corrupto -> dead-letter sem consumir tentativa nem chamar o sender.
 *
 * DEVE FALHAR em W0 (worker/delivery/InMemory inexistentes). ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts';
import * as EmailSubject from '#src/modules/notifications/domain/email/subject.ts';
import type {
  EmailMessage,
  EmailReceipt,
  EmailError,
} from '#src/modules/notifications/domain/email/types.ts';
import type { EmailSender } from '#src/modules/notifications/application/ports/email-sender.ts';

import { InMemoryEmailOutbox } from '#src/modules/notifications/adapters/outbox/email-outbox.in-memory.ts';
import { EmailSenderDelivery } from '#src/modules/notifications/adapters/event-delivery/event-delivery.email-sender.ts';
import { runOnce } from '#src/modules/notifications/worker/outbox-worker.ts';
import type { WorkerConfig } from '#src/modules/notifications/worker/outbox-worker.ts';

const NOW = new Date('2026-06-17T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };
const CONFIG: WorkerConfig = { batchSize: 10, maxAttempts: 3, pollIntervalMs: 1, idleSleepMs: 1 };

const makeMessage = (subjectRaw = 'Assunto'): EmailMessage => {
  const from = EmailAddress.parse('no-reply@bemcomum.org');
  const to = EmailAddress.parse('user@example.com');
  const subject = EmailSubject.parse(subjectRaw);
  if (!from.ok || !to.ok || !subject.ok) throw new Error('fixture invalida');
  return { from: from.value, to: [to.value], subject: subject.value, textBody: 'corpo' };
};

// EmailSender fake observavel: registra cada send; resultado configuravel.
const makeSender = (
  result: Result<EmailReceipt, EmailError>,
): EmailSender & { sent: EmailMessage[] } => {
  const sent: EmailMessage[] = [];
  return {
    sent,
    send: async (message) => {
      await Promise.resolve();
      sent.push(message);
      return result;
    },
  };
};

const okReceipt: Result<EmailReceipt, EmailError> = ok({
  messageId: '11111111-1111-1111-1111-111111111111',
  acceptedAt: NOW.toISOString(),
});
const failResult: Result<EmailReceipt, EmailError> = err({
  tag: 'transport-failed',
  reason: 'smtp down',
});

describe('notifications email worker — runOnce', () => {
  let store: ReturnType<typeof InMemoryEmailOutbox>;
  beforeEach(() => {
    store = InMemoryEmailOutbox();
  });

  it('CA3: delivery ok -> EmailSender.send recebe a mensagem e linha vira processed', async () => {
    await store.port.enqueue(makeMessage('Reset'), 'k1');
    const sender = makeSender(okReceipt);

    const r = await runOnce(
      { outbox: store, delivery: EmailSenderDelivery(sender, 'email-worker'), clock },
      CONFIG,
    );

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.delivered, 1);
    assert.equal(sender.sent.length, 1);
    assert.equal(sender.sent[0]?.subject, 'Reset');
    assert.equal(store.pending().length, 0);
    assert.equal(store.all()[0]?.processedAt !== null, true);
  });

  it('CA4: delivery falha, attempts+1 < max -> markFailed e permanece pendente', async () => {
    await store.port.enqueue(makeMessage(), 'k1');
    const sender = makeSender(failResult);

    const r = await runOnce(
      { outbox: store, delivery: EmailSenderDelivery(sender, 'email-worker'), clock },
      CONFIG,
    );

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.failed, 1);
    assert.equal(store.pending().length, 1);
    assert.equal(store.pending()[0]?.attempts, 1);
    assert.equal(store.deadLetter().length, 0);
  });

  it('CA5: na ultima tentativa (attempts+1 >= max) -> dead-letter', async () => {
    await store.port.enqueue(makeMessage(), 'k1');
    const id = store.all()[0]?.eventId;
    assert.ok(id !== undefined);
    if (id !== undefined) store.setAttempts(id, CONFIG.maxAttempts - 1);
    const sender = makeSender(failResult);

    const r = await runOnce(
      { outbox: store, delivery: EmailSenderDelivery(sender, 'email-worker'), clock },
      CONFIG,
    );

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.movedToDeadLetter, 1);
    assert.equal(store.pending().length, 0);
    assert.equal(store.deadLetter().length, 1);
  });

  it('CA6: payload corrupto -> dead-letter sem chamar o sender', async () => {
    await store.port.enqueue(makeMessage(), 'k1');
    const id = store.all()[0]?.eventId;
    assert.ok(id !== undefined);
    // Corrompe o payload diretamente (simula row invalida no banco).
    if (id !== undefined) store.corruptPayload(id, 'nao-e-json{');
    const sender = makeSender(okReceipt);

    const r = await runOnce(
      { outbox: store, delivery: EmailSenderDelivery(sender, 'email-worker'), clock },
      CONFIG,
    );

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.movedToDeadLetter, 1);
    assert.equal(sender.sent.length, 0);
    assert.equal(store.deadLetter().length, 1);
  });
});
