/**
 * PARTNERS-INVITE-DOMAIN-EVENT — W0 (RED) — CA1/CA6: outbox de e-mail dedicado do partners.
 *
 * `InMemoryParEmailOutbox` espelha `InMemoryAuthOutbox` (fatia 01): `append` (rejeita eventId
 * duplicado) + helpers do worker (withPendingBatch / findPendingForUpdate / markProcessed /
 * markFailed / moveToDeadLetter). Single-consumer destrutivo (so o email-dispatch).
 *
 * DEVE FALHAR em W0: `partners/adapters/outbox/par-email-outbox.in-memory.ts` ainda nao existe.
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { InMemoryParEmailOutbox } from '#src/modules/partners/adapters/outbox/par-email-outbox.in-memory.ts';
import type { OutboxMessage } from '#src/modules/partners/application/ports/email-outbox.ts';

const AT = new Date('2026-06-18T12:00:00.000Z');
// Pendência é por consumidor desde #800/#824 — id fixo de teste, sem semântica de fanout aqui
// (o comportamento com múltiplos consumidores é coberto em
// `tests/shared/outbox/fanout-two-consumers.test.ts`).
const CONSUMER_ID = 'par-email-outbox-test';

const inviteMessage = (eventId: string): OutboxMessage => ({
  eventId,
  aggregateId: 'collab-1',
  aggregateType: 'Collaborator',
  eventType: 'CollaboratorInvited',
  occurredAt: AT,
  payload: JSON.stringify({
    email: 'colaborador@example.com',
    autocadastroUrl: 'https://app.local/autocadastro?token=abc',
    recipientName: 'Fulano',
    occurredAt: AT.toISOString(),
  }),
});

describe('InMemoryParEmailOutbox (CA1/CA6)', () => {
  it('CA1 — append grava a mensagem como pendente', async () => {
    const outbox = InMemoryParEmailOutbox();
    const r = await outbox.port.append([inviteMessage('evt-1')]);
    assert.equal(r.ok, true);
    assert.equal(outbox.pendingFor(CONSUMER_ID).length, 1);
    assert.equal(outbox.all()[0]?.eventType, 'CollaboratorInvited');
    assert.equal(outbox.all()[0]?.aggregateType, 'Collaborator');
  });

  it('CA1 — append rejeita eventId duplicado (espelha a PK do banco)', async () => {
    const outbox = InMemoryParEmailOutbox();
    await outbox.port.append([inviteMessage('evt-1')]);
    const r = await outbox.port.append([inviteMessage('evt-1')]);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.tag, 'OutboxAppendDuplicateEventId');
  });

  it('CA1 — markProcessed remove do pending pool (idempotente)', async () => {
    const outbox = InMemoryParEmailOutbox();
    await outbox.port.append([inviteMessage('evt-1')]);
    await outbox.markProcessed(CONSUMER_ID, 'evt-1', AT);
    assert.equal(outbox.pendingFor(CONSUMER_ID).length, 0);
    // idempotente: segunda chamada nao quebra
    await outbox.markProcessed(CONSUMER_ID, 'evt-1', AT);
    assert.equal(outbox.pendingFor(CONSUMER_ID).length, 0);
  });

  it('CA6 — markFailed mantem pendente e atualiza attempts', async () => {
    const outbox = InMemoryParEmailOutbox();
    await outbox.port.append([inviteMessage('evt-1')]);
    await outbox.markFailed(CONSUMER_ID, 'evt-1', {
      now: AT,
      errorTag: 'transport-failed',
      attempt: 1,
    });
    const pending = outbox.pendingFor(CONSUMER_ID);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.attempts, 1);
  });

  it('CA6 — moveToDeadLetter remove do pending pool (preserva row)', async () => {
    const outbox = InMemoryParEmailOutbox();
    await outbox.port.append([inviteMessage('evt-1')]);
    await outbox.moveToDeadLetter(CONSUMER_ID, 'evt-1', AT, 'max-retries');
    assert.equal(outbox.pendingFor(CONSUMER_ID).length, 0);
    assert.equal(outbox.all().length, 1);
  });

  it('CA1 — withPendingBatch entrega rows + ops na mesma tx', async () => {
    const outbox = InMemoryParEmailOutbox();
    await outbox.port.append([inviteMessage('evt-1')]);
    const r = await outbox.withPendingBatch(CONSUMER_ID, 10, async (rows, ops) => {
      assert.equal(rows.length, 1);
      await ops.markProcessed(rows[0]!.eventId, AT);
      return rows.length;
    });
    assert.equal(r.ok, true);
    assert.equal(outbox.pendingFor(CONSUMER_ID).length, 0);
  });
});
