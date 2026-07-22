/**
 * FIN-PAYABLE-VIEW-BACKFILL (#236) · W0 — o core `backfillPayableViews` popula o read-model do
 * histórico (upsert em lote, idempotente). DEVE FALHAR em W0 (`backfill.ts` inexistente).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createInMemoryPayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.in-memory.ts';
import type { PayableView } from '#src/modules/financial/domain/payable-view/types.ts';
import { backfillPayableViews } from '#src/jobs/financial/payable-view-backfill/backfill.ts';

const record = (payableId: string, status: PayableView['status'] = 'Open'): PayableView => ({
  payableId,
  documentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  kind: 'Parent',
  retentionType: null,
  supplierRef: '11111111-1111-4111-8111-111111111111',
  contractRef: null,
  categoryRef: null,
  costCenterRef: null,
  programRef: null,
  valueCents: 77500,
  dueDate: '2026-07-01',
  status,
  // #239: campos adicionados à view (conta-débito + data de pagamento).
  debitAccountRef: null,
  paidAt: null,
});

describe('jobs/payable-view-backfill — backfillPayableViews (#236)', () => {
  it('CA1: aplica os records e conta applied', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await backfillPayableViews([record('p1'), record('p2')], store);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.applied, 2);
      assert.equal(r.value.failed, 0);
    }
    const list = await store.list();
    if (list.ok) assert.equal(list.value.length, 2);
  });

  it('CA2: idempotente — rerodar não duplica', async () => {
    const store = createInMemoryPayableViewStore();
    await backfillPayableViews([record('p1'), record('p2')], store);
    await backfillPayableViews([record('p1'), record('p2')], store);
    const list = await store.list();
    if (list.ok) assert.equal(list.value.length, 2);
  });

  it('CA3: vazio → {0,0}, sem escrita', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await backfillPayableViews([], store);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.applied, 0);
    const list = await store.list();
    if (list.ok) assert.equal(list.value.length, 0);
  });
});
