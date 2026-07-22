/**
 * FIN-DASHBOARD-RECENT-PAYMENTS (#239) · W0 — enriquecimento do read-model p/ o widget "Últimos
 * pagamentos": DocumentSaved grava debitAccountRef; PayableManuallyPaid grava paidAt; store expõe
 * listRecentPaid (Top-N pagos por data). DEVE FALHAR em W0 (campos/métodos inexistentes).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { applyPayableEvent } from '#src/modules/financial/application/use-cases/apply-payable-event.ts';
import { createInMemoryPayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.in-memory.ts';

const DOC = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SUP = '11111111-1111-4111-8111-111111111111';
const ACC = '99999999-9999-4999-8999-999999999999';

const documentSaved = (payableId: string) =>
  JSON.stringify({
    documentId: DOC,
    supplierRef: SUP,
    contractRef: null,
    categoryRef: null,
    costCenterRef: null,
    programRef: null,
    debitAccountRef: ACC,
    payables: [
      {
        payableId,
        kind: 'Parent',
        retentionType: null,
        valueCents: '77500',
        dueDate: '2026-07-01',
        status: 'Open',
      },
    ],
  });

const paidEvent = (payableId: string, paidAtIso: string) =>
  JSON.stringify({ documentId: DOC, payableId, paidAt: paidAtIso });

describe('financial/application — read-model recent-payments (#239)', () => {
  it('CA1: DocumentSaved grava debitAccountRef; PayableManuallyPaid grava status=Paid + paidAt', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    await applyPayableEvent(deps)({ eventType: 'DocumentSaved', payload: documentSaved('p1') });

    const rowAfter = async () => {
      const l = await store.list();
      return l.ok ? l.value[0] : undefined;
    };
    assert.equal((await rowAfter())?.debitAccountRef, ACC);
    assert.equal((await rowAfter())?.paidAt, null);

    await applyPayableEvent(deps)({
      eventType: 'PayableManuallyPaid',
      payload: paidEvent('p1', '2026-06-20T12:00:00.000Z'),
    });
    const row = await rowAfter();
    assert.equal(row?.status, 'Paid');
    assert.equal(row?.paidAt, '2026-06-20');
  });

  it('CA2: listRecentPaid retorna só Pagos, por paidAt desc, no máx N', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    // 3 pagos em datas diferentes + 1 não-pago.
    for (const [pid, day] of [
      ['p1', '2026-06-10T00:00:00.000Z'],
      ['p2', '2026-06-25T00:00:00.000Z'],
      ['p3', '2026-06-18T00:00:00.000Z'],
    ] as const) {
      await applyPayableEvent(deps)({ eventType: 'DocumentSaved', payload: documentSaved(pid) });
      await applyPayableEvent(deps)({
        eventType: 'PayableManuallyPaid',
        payload: paidEvent(pid, day),
      });
    }
    await applyPayableEvent(deps)({ eventType: 'DocumentSaved', payload: documentSaved('p4') });

    const recent = await store.listRecentPaid(2);
    assert.equal(recent.ok, true);
    if (recent.ok) {
      assert.equal(recent.value.length, 2);
      assert.equal(recent.value[0]?.payableId, 'p2'); // mais recente (25)
      assert.equal(recent.value[1]?.payableId, 'p3'); // depois (18)
      assert.ok(recent.value.every((r) => r.status === 'Paid'));
    }
  });
});
