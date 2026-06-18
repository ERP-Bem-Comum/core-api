/**
 * NOTIF-EMAIL-OUTBOX · W0 (RED) — adapter InMemory do EmailOutbox.
 *
 * Cobre CA1 (enqueue persiste com processedAt=null, attempts=0, payload=JSON)
 * e CA2 (idempotencia por idempotencyKey — segundo enqueue da mesma chave nao
 * cria segunda linha, retorna err duplicate).
 *
 * DEVE FALHAR em W0 (adapter/port inexistentes). ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts';
import * as EmailSubject from '#src/modules/notifications/domain/email/subject.ts';
import type { EmailMessage } from '#src/modules/notifications/domain/email/types.ts';
import { InMemoryEmailOutbox } from '#src/modules/notifications/adapters/outbox/email-outbox.in-memory.ts';

const makeMessage = (subjectRaw = 'Assunto'): EmailMessage => {
  const from = EmailAddress.parse('no-reply@bemcomum.org');
  const to = EmailAddress.parse('user@example.com');
  const subject = EmailSubject.parse(subjectRaw);
  if (!from.ok || !to.ok || !subject.ok) throw new Error('fixture invalida');
  return { from: from.value, to: [to.value], subject: subject.value, textBody: 'corpo' };
};

describe('InMemoryEmailOutbox.enqueue', () => {
  let store: ReturnType<typeof InMemoryEmailOutbox>;
  beforeEach(() => {
    store = InMemoryEmailOutbox();
  });

  it('CA1: enqueue cria linha pendente com attempts=0 e payload com JSON da mensagem', async () => {
    const msg = makeMessage();
    const r = await store.port.enqueue(msg, 'idem-key-1');

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(typeof r.value.eventId, 'string');

    const pending = store.pending();
    assert.equal(pending.length, 1);
    const row = pending[0];
    assert.ok(row !== undefined);
    if (row !== undefined) {
      assert.equal(row.processedAt, null);
      assert.equal(row.attempts, 0);
      const parsed = JSON.parse(row.payload) as { textBody?: string };
      assert.equal(parsed.textBody, 'corpo');
    }
  });

  it('CA2: mesma idempotencyKey -> err duplicate, sem segunda linha', async () => {
    const first = await store.port.enqueue(makeMessage('A'), 'dup-key');
    assert.equal(first.ok, true);

    const second = await store.port.enqueue(makeMessage('B'), 'dup-key');
    assert.equal(second.ok, false);

    assert.equal(store.all().length, 1);
  });

  it('CA2: idempotencyKeys distintas -> duas linhas', async () => {
    await store.port.enqueue(makeMessage('A'), 'k1');
    await store.port.enqueue(makeMessage('B'), 'k2');
    assert.equal(store.all().length, 2);
  });
});
