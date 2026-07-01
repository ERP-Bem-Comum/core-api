/**
 * #235 (FIN-PAYABLE-READMODEL) — W0 RED · CA2/CA3/CA4.
 * O projetor `applyPayableEvent` alimenta o read-model fin_payable_view a partir do payload
 * tipado dos eventos (ADR-0022). Cria linhas em DocumentSaved, atualiza status nas transições,
 * e é idempotente (reprocessar não duplica; guard de recência por occurredAt).
 * API ainda não existe → RED por inexistência.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { applyPayableEvent } from '#src/modules/financial/application/use-cases/apply-payable-event.ts';
import { createInMemoryPayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.in-memory.ts';

const DOC = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const P1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SUP = '11111111-1111-4111-8111-111111111111';
const CAT = '22222222-2222-4222-8222-222222222222';

const documentSaved = (occurredAt: string) =>
  JSON.stringify({
    documentId: DOC,
    occurredAt,
    supplierRef: SUP,
    contractRef: null,
    categoryRef: CAT,
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

const statusEvent = (payableId: string, occurredAt: string) =>
  JSON.stringify({ documentId: DOC, payableId, payableIds: [payableId], occurredAt });

describe('financial/application — applyPayableEvent projeta fin_payable_view (#235)', () => {
  it('CA2: DocumentSaved cria uma linha por título com refs/valor/dueDate/status=Open', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      payload: documentSaved('2026-06-15T12:00:00.000Z'),
    });
    assert.equal(r.ok, true);
    const list = await store.list();
    assert.equal(list.ok, true);
    if (list.ok) {
      assert.equal(list.value.length, 1);
      const row = list.value[0];
      assert.equal(row?.payableId, P1);
      assert.equal(row?.supplierRef, SUP);
      assert.equal(row?.categoryRef, CAT);
      assert.equal(row?.valueCents, 77500n);
      assert.equal(row?.status, 'Open');
    }
  });

  it('CA3: transições de status atualizam a linha (Approved/Paid/Cancelled/Open)', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    await applyPayableEvent(deps)({
      eventType: 'DocumentSaved',
      payload: documentSaved('2026-06-15T12:00:00.000Z'),
    });

    const statusAfter = async (): Promise<string | undefined> => {
      const l = await store.list();
      return l.ok ? l.value[0]?.status : undefined;
    };

    await applyPayableEvent(deps)({
      eventType: 'PayableApproved',
      payload: statusEvent(P1, '2026-06-16T12:00:00.000Z'),
    });
    assert.equal(await statusAfter(), 'Approved');

    await applyPayableEvent(deps)({
      eventType: 'PayableManuallyPaid',
      payload: statusEvent(P1, '2026-06-17T12:00:00.000Z'),
    });
    assert.equal(await statusAfter(), 'Paid');

    await applyPayableEvent(deps)({
      eventType: 'DocumentCancelled',
      payload: statusEvent(P1, '2026-06-18T12:00:00.000Z'),
    });
    assert.equal(await statusAfter(), 'Cancelled');
  });

  it('CA4: idempotência — reprocessar não duplica; evento mais antigo não regride status', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    await applyPayableEvent(deps)({
      eventType: 'DocumentSaved',
      payload: documentSaved('2026-06-15T12:00:00.000Z'),
    });
    // reprocessa DocumentSaved → não duplica
    await applyPayableEvent(deps)({
      eventType: 'DocumentSaved',
      payload: documentSaved('2026-06-15T12:00:00.000Z'),
    });
    const l1 = await store.list();
    if (l1.ok) assert.equal(l1.value.length, 1);

    // aplica Paid (T3), depois reaplica Approved (T2, mais antigo) → status permanece Paid
    await applyPayableEvent(deps)({
      eventType: 'PayableManuallyPaid',
      payload: statusEvent(P1, '2026-06-17T12:00:00.000Z'),
    });
    await applyPayableEvent(deps)({
      eventType: 'PayableApproved',
      payload: statusEvent(P1, '2026-06-16T12:00:00.000Z'),
    });
    const l2 = await store.list();
    if (l2.ok) assert.equal(l2.value[0]?.status, 'Paid');
  });

  it('CA (skip): evento fora do contrato → ok, sem escrita', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({
      eventType: 'ApproverEscalated',
      payload: '{}',
    });
    assert.equal(r.ok, true);
    const l = await store.list();
    if (l.ok) assert.equal(l.value.length, 0);
  });
});
