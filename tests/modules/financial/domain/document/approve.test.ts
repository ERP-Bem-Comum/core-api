import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate('11111111-1111-4111-8111-111111111111');
  if (!r.ok) throw new Error('test setup: supplier');
  return r.value;
};
const by = (): UserRef.UserRef => {
  const r = UserRef.rehydrate('22222222-2222-4222-8222-222222222222');
  if (!r.ok) throw new Error('test setup: user-ref');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('test setup: retention');
  return r.value;
};
const AT = new Date('2026-07-10');

// Documento NFS-e em Open com pai + 3 filhos (reusa Document.create — US1/US2).
const openNfse = (): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(100000),
    sourceDiscounts: money(5000),
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 5000), ret('IRRF', 1500), ret('INSS', 11000)],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!r.ok) throw new Error('test setup: open document');
  return r.value;
};

describe('financial/domain/document — approve (US3)', () => {
  it('CT-011: aprovar move o documento e todos os títulos (pai+filhos) para Approved', () => {
    const open = openNfse();
    const r = Document.approve({
      document: open.document,
      payables: open.payables,
      by: by(),
      at: AT,
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Approved');
      assert.equal(r.value.document.approvedBy, by());
      assert.equal(r.value.document.approvedAt.getTime(), AT.getTime());
      assert.equal(r.value.payables.parent.status, 'Approved');
      assert.equal(r.value.payables.children.length, 3);
      assert.ok(r.value.payables.children.every((c) => c.status === 'Approved'));
    }
  });

  it('emite PayableApproved para o pai e cada filho (herança)', () => {
    const open = openNfse();
    const r = Document.approve({
      document: open.document,
      payables: open.payables,
      by: by(),
      at: AT,
    });
    if (r.ok) {
      const approved = r.value.events.filter((e) => e.type === 'PayableApproved');
      assert.equal(approved.length, 4); // 1 pai + 3 filhos
    }
  });

  it('CT-012: preserva valores vitais ao aprovar (imutabilidade)', () => {
    const open = openNfse();
    const r = Document.approve({
      document: open.document,
      payables: open.payables,
      by: by(),
      at: AT,
    });
    if (r.ok) {
      assert.equal(r.value.document.netValue.cents, open.document.netValue.cents);
      assert.equal(r.value.payables.parent.value.cents, open.payables.parent.value.cents);
      assert.equal(r.value.document.supplier, open.document.supplier);
    }
  });
});
