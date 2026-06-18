/**
 * NOTIF-EMAIL-OUTBOX · W0 (RED) — mapper EmailMessage <-> payload do outbox.
 *
 * `serializeEmailMessage` produz o JSON persistido no `payload` do outbox.
 * `rowToEmailMessage` (RowToProcessed<EmailMessage>) desserializa a row de volta
 * em EmailMessage reconstruindo branded types via parse; payload corrupto -> err
 * (worker manda para DLQ — CA6).
 *
 * DEVE FALHAR em W0 (mapper inexistente). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts';
import * as EmailSubject from '#src/modules/notifications/domain/email/subject.ts';
import type { EmailMessage } from '#src/modules/notifications/domain/email/types.ts';
import type { OutboxRow } from '#src/shared/outbox/index.ts';
import {
  serializeEmailMessage,
  rowToEmailMessage,
} from '#src/modules/notifications/adapters/outbox/email-message.mapper.ts';

const NOW = new Date('2026-06-17T12:00:00.000Z');

const makeMessage = (): EmailMessage => {
  const from = EmailAddress.parse('no-reply@bemcomum.org');
  const to = EmailAddress.parse('user@example.com');
  const subject = EmailSubject.parse('Recuperacao de senha');
  if (!from.ok || !to.ok || !subject.ok) throw new Error('fixture invalida');
  return {
    from: from.value,
    to: [to.value],
    subject: subject.value,
    textBody: 'corpo do email',
  };
};

const makeRow = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  eventId: 'evt-1',
  aggregateId: 'agg-1',
  aggregateType: 'EmailMessage',
  eventType: 'EmailEnqueued',
  schemaVersion: 1,
  occurredAt: NOW,
  enqueuedAt: NOW,
  processedAt: null,
  attempts: 0,
  payload: serializeEmailMessage(makeMessage()),
  ...over,
});

describe('email-message.mapper', () => {
  it('round-trip: serialize -> rowToEmailMessage reconstroi a EmailMessage', () => {
    const original = makeMessage();
    const row = makeRow({ payload: serializeEmailMessage(original) });

    const mapped = rowToEmailMessage(row);

    assert.equal(mapped.ok, true);
    if (mapped.ok) {
      assert.equal(mapped.value.from, original.from);
      assert.deepEqual([...mapped.value.to], [...original.to]);
      assert.equal(mapped.value.subject, original.subject);
      assert.equal(mapped.value.textBody, original.textBody);
    }
  });

  it('CA6: payload que nao e JSON -> err (vai para DLQ)', () => {
    const row = makeRow({ payload: 'nao-e-json{' });
    const mapped = rowToEmailMessage(row);
    assert.equal(mapped.ok, false);
  });

  it('CA6: payload JSON mas com email invalido -> err', () => {
    const row = makeRow({
      payload: JSON.stringify({
        from: 'sem-arroba',
        to: ['user@example.com'],
        subject: 'x',
        textBody: 'y',
      }),
    });
    const mapped = rowToEmailMessage(row);
    assert.equal(mapped.ok, false);
  });

  it('CA6: payload JSON sem destinatarios -> err', () => {
    const row = makeRow({
      payload: JSON.stringify({
        from: 'no-reply@bemcomum.org',
        to: [],
        subject: 'x',
        textBody: 'y',
      }),
    });
    const mapped = rowToEmailMessage(row);
    assert.equal(mapped.ok, false);
  });
});
