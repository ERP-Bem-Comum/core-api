import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
// W0 RED: confirm/undo ainda não existem.
import { confirm, undo } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const WHEN = new Date('2024-05-19T09:00:00.000Z');

const snap = (valueCents: number, status: DocumentStatus = 'Paid') => ({
  id: PayableId.generate(),
  status,
  valueCents,
});

type Difference = Readonly<{
  valueCents: number;
  treatment: 'Interest' | 'Penalty' | 'Discount' | 'Fee' | 'Partial';
}>;

const input = (
  payables: readonly ReturnType<typeof snap>[],
  transactionValueCents: number,
  difference?: Difference,
) => ({
  reconciliationId: ReconciliationId.generate(),
  transactionId: StatementTransactionId.generate(),
  transactionValueCents,
  payables,
  reconciledBy: ACTOR,
  occurredAt: WHEN,
  ...(difference !== undefined ? { difference } : {}),
});

describe('financial/domain/reconciliation — confirm', () => {
  it('CA1 Individual: 1 título Paid = transação → ok, type Individual, 1 PayableReconciled', () => {
    const r = confirm(input([snap(8000)], 8000));
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.reconciliation.type, 'Individual');
      assert.equal(r.value.reconciliation.status, 'Active');
      assert.equal(r.value.events.filter((e) => e.type === 'PayableReconciled').length, 1);
    }
  });

  it('CA2 Multiple: 2 títulos (60+40) = transação 100 → Multiple, 2 PayableReconciled', () => {
    const r = confirm(input([snap(6000), snap(4000)], 10000));
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.reconciliation.type, 'Multiple');
      assert.equal(r.value.events.filter((e) => e.type === 'PayableReconciled').length, 2);
    }
  });

  it('CA3 R2: título não-Paid → title-not-paid', () => {
    const r = confirm(input([snap(8000, 'Approved')], 8000));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'title-not-paid');
  });

  it('CA4 R3: soma ≠ transação sem difference → reconciliation-not-balanced', () => {
    const r = confirm(input([snap(8000)], 8450));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'reconciliation-not-balanced');
  });

  it('CA5 Partial: título 8000 + difference 450 Interest = 8450 → Partial', () => {
    const r = confirm(input([snap(8000)], 8450, { valueCents: 450, treatment: 'Interest' }));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.reconciliation.type, 'Partial');
  });

  it('CA6 vazio: sem títulos → empty-reconciliation', () => {
    const r = confirm(input([], 0));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'empty-reconciliation');
  });
});

describe('financial/domain/reconciliation — undo (R7)', () => {
  it('CA7: Active → undo → Undone preservado + ReconciliationUndone', () => {
    const c = confirm(input([snap(8000)], 8000));
    assert.equal(c.ok, true);
    if (c.ok) {
      const u = undo(c.value.reconciliation, { undoneBy: ACTOR, occurredAt: WHEN });
      assert.equal(u.ok, true);
      if (u.ok) {
        assert.equal(u.value.reconciliation.status, 'Undone');
        assert.equal(u.value.reconciliation.audit.undoneBy, ACTOR);
        assert.equal(u.value.events.filter((e) => e.type === 'ReconciliationUndone').length, 1);
      }
    }
  });

  it('CA8: undo em já-Undone → reconciliation-already-undone', () => {
    const c = confirm(input([snap(8000)], 8000));
    if (c.ok) {
      const u1 = undo(c.value.reconciliation, { undoneBy: ACTOR, occurredAt: WHEN });
      if (u1.ok) {
        const u2 = undo(u1.value.reconciliation, { undoneBy: ACTOR, occurredAt: WHEN });
        assert.equal(isErr(u2), true);
        if (!u2.ok) assert.equal(u2.error, 'reconciliation-already-undone');
      }
    }
  });
});
