import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId, PayableId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('setup: money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('setup: supplier');
  return r.value;
};
const user = (): UserRef.UserRef => {
  const r = UserRef.rehydrate(USER);
  if (!r.ok) throw new Error('setup: user');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('setup: retention');
  return r.value;
};

const approvedNfse = () => {
  const created = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(1000000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 35000), ret('IRRF', 15000)],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!created.ok) throw new Error('setup: create');
  const approved = Document.approve({
    document: created.value.document,
    payables: created.value.payables,
    by: user(),
    at: new Date('2026-07-10'),
  });
  if (!approved.ok) throw new Error('setup: approve');
  return { document: approved.value.document, payables: approved.value.payables, by: user() };
};

describe('financial/domain/document — payPayableManually (#223)', () => {
  it('paga UM título (Aprovado→Pago), deixa os outros Aprovados, emite PayableManuallyPaid', () => {
    const { document, payables, by } = approvedNfse();
    const r = Document.payPayableManually({
      document,
      payables,
      payableId: payables.parent.id,
      by,
      at: new Date('2026-07-15'),
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.payables.parent.status, 'Paid');
    assert.ok(r.value.payables.children.every((c) => c.status === 'Approved'));
    assert.equal(r.value.events.length, 1);
    assert.equal(r.value.events[0]?.type, 'PayableManuallyPaid');
  });

  it('motivo opcional → registrado no evento quando presente', () => {
    const { document, payables, by } = approvedNfse();
    const r = Document.payPayableManually({
      document,
      payables,
      payableId: payables.children[0]?.id ?? payables.parent.id,
      by,
      at: new Date('2026-07-15'),
      reason: 'pago no caixa',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (r.ok) {
      const ev = r.value.events[0];
      assert.equal((ev as { reason?: string }).reason, 'pago no caixa');
    }
  });

  it('payableId inexistente → payable-not-found', () => {
    const { document, payables, by } = approvedNfse();
    const r = Document.payPayableManually({
      document,
      payables,
      payableId: PayableId.generate(),
      by,
      at: new Date('2026-07-15'),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'payable-not-found');
  });

  it('título já Pago → payable-not-approved (não paga 2x)', () => {
    const { document, payables, by } = approvedNfse();
    const first = Document.payPayableManually({
      document,
      payables,
      payableId: payables.parent.id,
      by,
      at: new Date('2026-07-15'),
    });
    if (!first.ok) throw new Error('setup: first payment');
    const second = Document.payPayableManually({
      document,
      payables: first.value.payables,
      payableId: payables.parent.id,
      by,
      at: new Date('2026-07-16'),
    });
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.error, 'payable-not-approved');
  });
});
