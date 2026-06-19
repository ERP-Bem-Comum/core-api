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

const approvedNfse = (): Document.ApproveDocumentOutput => {
  const open = Document.create({
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
  if (!open.ok) throw new Error('test setup: open');
  const appr = Document.approve({
    document: open.value.document,
    payables: open.value.payables,
    by: by(),
    at: new Date('2026-07-10'),
  });
  if (!appr.ok) throw new Error('test setup: approve');
  return appr.value;
};

describe('financial/domain/document — editMetadata (#165)', () => {
  it('#165: editar dueDate de Approved preserva status + payables (ids/status) e propaga dueDate', () => {
    const appr = approvedNfse();
    const ids = [appr.payables.parent.id, ...appr.payables.children.map((c) => c.id)];
    const newDue = new Date('2027-01-15');

    const r = Document.editMetadata({
      document: appr.document,
      payables: appr.payables,
      dueDate: newDue,
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Approved'); // status preservado
      assert.equal(r.value.document.dueDate.getTime(), newDue.getTime());
      // payables: ids preservados (NÃO regenerados), status preservado, dueDate propagado in-place
      const newIds = [r.value.payables.parent.id, ...r.value.payables.children.map((c) => c.id)];
      assert.deepEqual(newIds, ids);
      assert.equal(r.value.payables.parent.status, 'Approved');
      assert.equal(r.value.payables.parent.dueDate.getTime(), newDue.getTime());
      assert.ok(r.value.payables.children.every((c) => c.dueDate.getTime() === newDue.getTime()));
      assert.equal(r.value.payables.children.length, 3);
    }
  });

  it('#165: editar description de Approved atualiza só a descrição (status e payables intactos)', () => {
    const appr = approvedNfse();
    const r = Document.editMetadata({
      document: appr.document,
      payables: appr.payables,
      description: 'descricao revisada',
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Approved');
      assert.equal(r.value.document.description, 'descricao revisada');
      assert.equal(r.value.payables.parent.status, 'Approved');
    }
  });
});
