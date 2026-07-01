/**
 * FIN-PAYABLE-PROJECTION-WORKER (#307) · W0 — o EventDelivery do composition root (consumer
 * 'financial-payable-view') cola o evento do `fin_outbox` ao `applyPayableEvent` do financial.
 *
 * DEVE FALHAR em W0 (`src/workers/payable-view-projection/delivery.ts` inexistente).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import type { OutboxRow } from '#src/shared/outbox/index.ts';
import { createInMemoryPayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.in-memory.ts';
import {
  createPayableProjectionDelivery,
  rowToMessage,
} from '#src/workers/payable-view-projection/delivery.ts';

const DOC = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const P1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SUP = '11111111-1111-4111-8111-111111111111';

const documentSavedPayload = (): string =>
  JSON.stringify({
    type: 'DocumentSaved',
    documentId: DOC,
    payableIds: [P1],
    supplierRef: SUP,
    contractRef: null,
    categoryRef: null,
    costCenterRef: null,
    programRef: null,
    payables: [
      {
        payableId: P1,
        kind: 'Parent',
        retentionType: null,
        valueCents: '77500',
        dueDate: '2026-07-01',
        status: 'Open',
      },
    ],
  });

const row = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  eventId: 'evt-1',
  aggregateId: DOC,
  aggregateType: 'Document',
  eventType: 'DocumentSaved',
  schemaVersion: 1,
  occurredAt: new Date('2026-06-15T12:00:00.000Z'),
  enqueuedAt: new Date('2026-06-15T12:00:00.000Z'),
  processedAt: null,
  attempts: 0,
  payload: documentSavedPayload(),
  ...over,
});

describe('workers/payable-view-projection — delivery (#307 · CA1)', () => {
  it('rowToMessage extrai eventType + payload (opaco) da row', () => {
    const msg = rowToMessage(row());
    assert.equal(isOk(msg), true);
    if (msg.ok) {
      assert.equal(msg.value.eventType, 'DocumentSaved');
      assert.equal(msg.value.payload, documentSavedPayload());
    }
  });

  it('deliver(DocumentSaved) → aplica no read-model e retorna ok', async () => {
    const store = createInMemoryPayableViewStore();
    const delivery = createPayableProjectionDelivery(store);
    assert.equal(delivery.consumerId, 'financial-payable-view');

    const msg = rowToMessage(row());
    assert.equal(isOk(msg), true);
    if (msg.ok) {
      const result = await delivery.deliver(msg.value);
      assert.equal(isOk(result), true);
    }
    const list = await store.list();
    if (list.ok) assert.equal(list.value.length, 1);
  });

  it('deliver com payload malformado → DeliveryError (worker faz retry/DLQ)', async () => {
    const store = createInMemoryPayableViewStore();
    const delivery = createPayableProjectionDelivery(store);
    const result = await delivery.deliver({ eventType: 'DocumentSaved', payload: '{bad json' });
    assert.equal(isErr(result), true);
  });

  it('eventType fora do contrato → ok, sem escrita', async () => {
    const store = createInMemoryPayableViewStore();
    const delivery = createPayableProjectionDelivery(store);
    const result = await delivery.deliver({ eventType: 'ApproverEscalated', payload: '{}' });
    assert.equal(isOk(result), true);
    const list = await store.list();
    if (list.ok) assert.equal(list.value.length, 0);
  });
});
