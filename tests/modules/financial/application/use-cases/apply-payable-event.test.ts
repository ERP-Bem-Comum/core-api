/**
 * #235 (FIN-PAYABLE-READMODEL) — W0 RED · CA2/CA3/CA4.
 * O projetor `applyPayableEvent` alimenta o read-model fin_payable_view a partir do payload
 * tipado dos eventos (ADR-0022). Cria linhas em DocumentSaved, atualiza status nas transições,
 * e é idempotente (reprocessar o mesmo evento não duplica nem corrompe — operações set-based).
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

const documentSaved = () =>
  JSON.stringify({
    documentId: DOC,
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

const statusEvent = (payableId: string) =>
  JSON.stringify({ documentId: DOC, payableId, payableIds: [payableId] });

describe('financial/application — applyPayableEvent projeta fin_payable_view (#235)', () => {
  it('CA2: DocumentSaved cria uma linha por título com refs/valor/dueDate/status=Open', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      payload: documentSaved(),
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
      assert.equal(row?.valueCents, 77500);
      assert.equal(row?.status, 'Open');
    }
  });

  it('CA3: transições de status atualizam a linha (Approved/Paid/Cancelled/Open)', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    await applyPayableEvent(deps)({ eventType: 'DocumentSaved', payload: documentSaved() });

    const statusAfter = async (): Promise<string | undefined> => {
      const l = await store.list();
      return l.ok ? l.value[0]?.status : undefined;
    };

    await applyPayableEvent(deps)({ eventType: 'PayableApproved', payload: statusEvent(P1) });
    assert.equal(await statusAfter(), 'Approved');

    await applyPayableEvent(deps)({ eventType: 'PayableManuallyPaid', payload: statusEvent(P1) });
    assert.equal(await statusAfter(), 'Paid');

    await applyPayableEvent(deps)({ eventType: 'DocumentCancelled', payload: statusEvent(P1) });
    assert.equal(await statusAfter(), 'Cancelled');

    await applyPayableEvent(deps)({ eventType: 'ApprovalUndone', payload: statusEvent(P1) });
    assert.equal(await statusAfter(), 'Open');
  });

  it('CA4: idempotência — reprocessar o mesmo evento não duplica nem corrompe', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    await applyPayableEvent(deps)({ eventType: 'DocumentSaved', payload: documentSaved() });
    await applyPayableEvent(deps)({ eventType: 'DocumentSaved', payload: documentSaved() });
    const l1 = await store.list();
    if (l1.ok) assert.equal(l1.value.length, 1);

    await applyPayableEvent(deps)({ eventType: 'PayableApproved', payload: statusEvent(P1) });
    await applyPayableEvent(deps)({ eventType: 'PayableApproved', payload: statusEvent(P1) });
    const l2 = await store.list();
    if (l2.ok) {
      assert.equal(l2.value.length, 1);
      assert.equal(l2.value[0]?.status, 'Approved');
    }
  });

  it('CA (skip): evento fora do contrato → ok, sem escrita', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({ eventType: 'ApproverEscalated', payload: '{}' });
    assert.equal(r.ok, true);
    const l = await store.list();
    if (l.ok) assert.equal(l.value.length, 0);
  });
});
