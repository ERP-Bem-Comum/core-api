import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as DocumentId from '#src/modules/financial/domain/shared/document-id.ts';
import type { Payable } from '#src/modules/financial/domain/payable/types.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
// W0 RED: as transições reconcile/unreconcile ainda não existem.
import { reconcile, unreconcile } from '#src/modules/financial/domain/payable/payable.ts';

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};

const buildPayable = (status: DocumentStatus): Payable => ({
  id: PayableId.generate(),
  origin: DocumentId.generate(),
  kind: 'Parent',
  retentionType: null,
  status,
  value: money(8000),
  dueDate: new Date('2024-05-18T00:00:00.000Z'),
  paymentMethod: 'TED',
});

// CA9: transições Paid↔Reconciled.
describe('financial/domain/payable — reconcile / unreconcile', () => {
  it('reconcile: Paid → Reconciled', () => {
    const r = reconcile(buildPayable('Paid'));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.status, 'Reconciled');
  });

  it('reconcile: título não-Paid → title-not-paid', () => {
    const r = reconcile(buildPayable('Approved'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'title-not-paid');
  });

  it('unreconcile: Reconciled → Paid', () => {
    const r = unreconcile(buildPayable('Reconciled'));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.status, 'Paid');
  });

  it('unreconcile: título não-Reconciled → title-not-reconciled', () => {
    const r = unreconcile(buildPayable('Paid'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'title-not-reconciled');
  });
});
