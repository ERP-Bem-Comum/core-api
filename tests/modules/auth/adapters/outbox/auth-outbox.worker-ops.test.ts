/**
 * NOTIF-EMAIL-EVENT-CONSUMER — W0 (RED) — CA1: helpers de worker no auth_outbox.
 *
 * O auth_outbox (fatia 01) so tem `append`/`appendOutboxInTx`. Esta fatia (02) adiciona os
 * helpers de CONSUMO do worker (molde partners `InMemoryOutbox`):
 *   - findPendingForUpdate / withPendingBatch (claim de batch pendente)
 *   - markProcessed (idempotente, sai do pending pool)
 *   - markFailed (incrementa attempts; segue pendente)
 *   - moveToDeadLetter (sai do pending pool; preserva audit)
 *
 * DEVE FALHAR em W0: `InMemoryAuthOutbox()` ainda nao expoe os helpers do worker
 * (so `port`/`all`/`pending`/`clear`). Os asserts de tipo/runtime quebram.
 *
 * Unit-level: usa o InMemory (paridade semantica com o Drizzle). A versao Drizzle/MySQL
 * e coberta por auth-outbox.worker-ops.drizzle-mysql.test.ts (gated MYSQL_INTEGRATION=1).
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { InMemoryAuthOutbox } from '#src/modules/auth/adapters/outbox/auth-outbox.in-memory.ts';
import type { OutboxMessage } from '#src/modules/auth/application/ports/outbox.ts';

const AT = new Date('2026-06-18T12:00:00.000Z');

const mkMessage = (over: Partial<OutboxMessage> = {}): OutboxMessage => ({
  eventId: over.eventId ?? 'evt-1',
  aggregateId: over.aggregateId ?? 'user-1',
  aggregateType: over.aggregateType ?? 'User',
  eventType: over.eventType ?? 'PasswordResetRequested',
  occurredAt: over.occurredAt ?? AT,
  payload: over.payload ?? JSON.stringify({ email: 'a@b.com', resetUrl: 'https://x/y' }),
});

describe('auth_outbox InMemory — helpers do worker (CA1)', () => {
  it('findPendingForUpdate retorna apenas rows pendentes, ordenadas por occurredAt', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([
      mkMessage({ eventId: 'evt-2', occurredAt: new Date('2026-06-18T12:00:02.000Z') }),
      mkMessage({ eventId: 'evt-1', occurredAt: new Date('2026-06-18T12:00:01.000Z') }),
    ]);
    // Act
    const pending = await outbox.findPendingForUpdate(10);
    // Assert
    assert.equal(isOk(pending), true);
    if (pending.ok) {
      assert.equal(pending.value.length, 2);
      assert.equal(pending.value[0]?.eventId, 'evt-1'); // mais antigo primeiro
    }
  });

  it('markProcessed retira a row do pending pool (idempotente)', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([mkMessage({ eventId: 'evt-1' })]);
    // Act
    const r1 = await outbox.markProcessed('evt-1', AT);
    const r2 = await outbox.markProcessed('evt-1', AT); // idempotente
    // Assert
    assert.equal(isOk(r1), true);
    assert.equal(isOk(r2), true);
    assert.equal(outbox.pending().length, 0);
    assert.equal(outbox.all().length, 1); // row preservada (audit)
  });

  it('markFailed incrementa attempts e mantem a row pendente', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([mkMessage({ eventId: 'evt-1' })]);
    // Act
    const r = await outbox.markFailed('evt-1', AT, 'DeliveryUnavailable', 1);
    // Assert
    assert.equal(isOk(r), true);
    const pending = outbox.pending();
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.attempts, 1);
  });

  it('moveToDeadLetter retira a row do pending pool (audit preservado, sem tabela DLQ)', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([mkMessage({ eventId: 'evt-1' })]);
    // Act
    const r = await outbox.moveToDeadLetter('evt-1', AT, 'delivery-error: DeliveryUnavailable');
    // Assert
    assert.equal(isOk(r), true);
    assert.equal(outbox.pending().length, 0);
  });

  it('withPendingBatch entrega rows + ops na mesma sessao; markProcessed remove do pending', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([mkMessage({ eventId: 'evt-1' }), mkMessage({ eventId: 'evt-2' })]);
    // Act
    const r = await outbox.withPendingBatch(10, async (rows, ops) => {
      for (const row of rows) await ops.markProcessed(row.eventId, AT);
      return rows.length;
    });
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, 2);
    assert.equal(outbox.pending().length, 0);
  });
});
