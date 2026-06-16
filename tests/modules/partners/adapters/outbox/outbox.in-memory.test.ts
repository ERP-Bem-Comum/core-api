/**
 * PAR-OUTBOX-INFRA — W0 (RED) — adapter InMemory do OutboxPort (partners).
 *
 * Espelha tests/modules/contracts/adapters/outbox/outbox.in-memory.test.ts, mas
 * o outbox do partners é GENÉRICO: `append` recebe `OutboxMessage[]` já montadas
 * (não eventos de domínio — quem monta é PAR-SUPPLIER-EVENTS). `aggregate_type`
 * aceita só 'Supplier' por ora.
 *
 * Estado W0: RED — InMemoryOutbox (partners) e o port ainda não existem →
 *   ERR_MODULE_NOT_FOUND nos imports.
 *
 * Cenários (espelham o contrato de outbox do contracts):
 *   1. append([]) é no-op → ok(undefined), 0 rows.
 *   2. append([msg]) registra 1 row com processedAt null e attempts 0.
 *   3. append([m1, m2]) registra 2 rows; pending() lista as pendentes.
 *   4. append com eventId duplicado → err OutboxAppendDuplicateEventId.
 *   5. withPendingBatch entrega pendentes + ops; markProcessed marca (idempotente).
 *   6. moveToDeadLetter move a row da outbox para a DLQ.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { isOk } from '#src/shared/index.ts';
import { InMemoryOutbox } from '#src/modules/partners/adapters/outbox/outbox.in-memory.ts';
import type { OutboxMessage } from '#src/modules/partners/application/ports/outbox.ts';

// ─── fixture ────────────────────────────────────────────────────────────────

const mkMessage = (over: Partial<OutboxMessage> = {}): OutboxMessage => ({
  eventId: over.eventId ?? randomUUID(),
  aggregateId: over.aggregateId ?? randomUUID(),
  aggregateType: over.aggregateType ?? 'Supplier',
  eventType: over.eventType ?? 'SupplierRegistered',
  occurredAt: over.occurredAt ?? new Date('2026-01-15T10:00:00.000Z'),
  payload:
    over.payload ?? JSON.stringify({ supplierRef: 'ref', name: 'X', document: '00000000000191' }),
});

// ─── suite ──────────────────────────────────────────────────────────────────

describe('PAR-OUTBOX-INFRA — InMemoryOutbox', () => {
  let outbox: ReturnType<typeof InMemoryOutbox>;

  beforeEach(() => {
    outbox = InMemoryOutbox();
  });

  it('append([]) é no-op e retorna ok(undefined)', async () => {
    const r = await outbox.port.append([]);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, undefined);
    assert.equal(outbox.all().length, 0);
  });

  it('append([msg]) registra 1 row com processedAt null e attempts 0', async () => {
    const msg = mkMessage({ eventType: 'SupplierRegistered' });
    const r = await outbox.port.append([msg]);
    assert.equal(isOk(r), true);

    const rows = outbox.all();
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row !== undefined);
    assert.equal(row.eventId, msg.eventId);
    assert.equal(row.processedAt, null);
    assert.equal(row.attempts, 0);
    assert.equal(row.eventType, 'SupplierRegistered');
    assert.equal(row.aggregateType, 'Supplier');
    assert.equal(row.payload, msg.payload);
  });

  it('append([m1, m2]) registra 2 rows; pending() lista pendentes', async () => {
    const m1 = mkMessage({ eventType: 'SupplierRegistered' });
    const m2 = mkMessage({ eventType: 'SupplierEdited' });
    await outbox.port.append([m1, m2]);
    assert.equal(outbox.all().length, 2);
    assert.equal(outbox.pending().length, 2);
  });

  it('append com eventId duplicado retorna err OutboxAppendDuplicateEventId', async () => {
    const dupId = randomUUID();
    const first = await outbox.port.append([mkMessage({ eventId: dupId })]);
    assert.equal(isOk(first), true);

    const second = await outbox.port.append([mkMessage({ eventId: dupId })]);
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.equal(second.error.tag, 'OutboxAppendDuplicateEventId');
      const e = second.error as { tag: string; eventId: string };
      assert.equal(e.eventId, dupId);
    }
  });

  it('withPendingBatch entrega pendentes e markProcessed marca (idempotente)', async () => {
    const m1 = mkMessage({ occurredAt: new Date('2026-01-15T10:00:00.000Z') });
    const m2 = mkMessage({ occurredAt: new Date('2026-01-15T10:01:00.000Z') });
    await outbox.port.append([m1, m2]);

    const r = await outbox.withPendingBatch(10, async (rows, ops) => {
      assert.equal(rows.length, 2);
      // entrega o primeiro
      const first = rows[0];
      assert.ok(first !== undefined);
      const mark = await ops.markProcessed(first.eventId, new Date('2026-01-15T11:00:00.000Z'));
      assert.equal(isOk(mark), true);
      // idempotência: marcar de novo é ok (no-op)
      const again = await ops.markProcessed(first.eventId, new Date('2026-01-15T12:00:00.000Z'));
      assert.equal(isOk(again), true);
      return rows.length;
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, 2);

    // após marcar 1, só resta 1 pendente
    assert.equal(outbox.pending().length, 1);
  });

  it('moveToDeadLetter move a row da outbox para a DLQ', async () => {
    const msg = mkMessage();
    await outbox.port.append([msg]);
    assert.equal(outbox.all().length, 1);

    const failedAt = new Date('2026-01-15T13:00:00.000Z');
    const moved = await outbox.moveToDeadLetter(msg.eventId, failedAt, 'max-retries-exceeded');
    assert.equal(isOk(moved), true);

    assert.equal(outbox.all().length, 0, 'row sai da outbox');
    const dlq = outbox.deadLetter();
    assert.equal(dlq.length, 1, 'row entra na DLQ');
    const dlqRow = dlq[0];
    assert.ok(dlqRow !== undefined);
    assert.equal(dlqRow.eventId, msg.eventId);
    assert.equal(dlqRow.lastError, 'max-retries-exceeded');
    assert.equal(dlqRow.failedAt.getTime(), failedAt.getTime());
    assert.equal(dlqRow.payload, msg.payload);
  });

  it('markFailed incrementa attempts da row pendente', async () => {
    const msg = mkMessage();
    await outbox.port.append([msg]);
    const r = await outbox.markFailed(msg.eventId, new Date(), 'DeliveryUnavailable', 2);
    assert.equal(isOk(r), true);
    const row = outbox.all().find((x) => x.eventId === msg.eventId);
    assert.ok(row !== undefined);
    assert.equal(row.attempts, 2);
  });
});
