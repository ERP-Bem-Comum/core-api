/**
 * WORKER-SUPPLIER-PROJECTION · W0 — o EventDelivery do composition root (consumer
 * 'financial-supplier-view') cola o evento do `par_outbox` ao `applySupplierEvent` do financial.
 *
 * DEVE FALHAR em W0 (`src/workers/supplier-view-projection/delivery.ts` inexistente).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import type { OutboxRow } from '#src/shared/outbox/index.ts';
import { createInMemorySupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.in-memory.ts';
import {
  createSupplierProjectionDelivery,
  rowToMessage,
} from '#src/workers/supplier-view-projection/delivery.ts';

const REF = '11111111-1111-4111-8111-111111111111';
const payload = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({
    supplierRef: REF,
    name: 'Gráfica Boa Impressão',
    document: '11222333000181',
    occurredAt: '2026-06-16T12:00:00.000Z',
    ...over,
  });

const row = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  eventId: 'evt-1',
  aggregateId: REF,
  aggregateType: 'Supplier',
  eventType: 'SupplierRegistered',
  schemaVersion: 1,
  occurredAt: new Date('2026-06-16T12:00:00.000Z'),
  enqueuedAt: new Date('2026-06-16T12:00:00.000Z'),
  processedAt: null,
  attempts: 0,
  payload: payload(),
  ...over,
});

describe('supplier-view-projection delivery', () => {
  it('rowToMessage extrai eventType + payload (opaco) da row', () => {
    const m = rowToMessage(row());
    assert.equal(isOk(m), true);
    if (m.ok) {
      assert.equal(m.value.eventType, 'SupplierRegistered');
      assert.equal(m.value.payload, payload());
    }
  });

  it('deliver SupplierRegistered → aplica no read-model e retorna ok', async () => {
    const store = createInMemorySupplierViewStore();
    const delivery = createSupplierProjectionDelivery(store);
    assert.equal(delivery.consumerId, 'financial-supplier-view');
    const m = rowToMessage(row());
    assert.equal(m.ok, true);
    if (!m.ok) return;
    const r = await delivery.deliver(m.value);
    assert.equal(isOk(r), true);
    const got = await store.get(REF);
    if (got.ok) assert.equal(got.value?.name, 'Gráfica Boa Impressão');
  });

  it('deliver com payload malformado → err (DeliveryError → worker faz retry/DLQ)', async () => {
    const store = createInMemorySupplierViewStore();
    const delivery = createSupplierProjectionDelivery(store);
    const m = rowToMessage(row({ payload: '{ not json' }));
    if (!m.ok) return;
    const r = await delivery.deliver(m.value);
    assert.equal(r.ok, false);
  });

  it('deliver eventType fora do contrato → ok, sem escrita', async () => {
    const store = createInMemorySupplierViewStore();
    const delivery = createSupplierProjectionDelivery(store);
    const m = rowToMessage(row({ eventType: 'SupplierDeactivated' }));
    if (!m.ok) return;
    const r = await delivery.deliver(m.value);
    assert.equal(isOk(r), true);
    const got = await store.get(REF);
    if (got.ok) assert.equal(got.value, null);
  });
});
