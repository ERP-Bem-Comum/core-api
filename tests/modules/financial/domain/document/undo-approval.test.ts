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

const approved = (): Document.ApproveDocumentOutput => {
  const created = Document.create({
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
  if (!created.ok) throw new Error('test setup: create');
  const a = Document.approve({
    document: created.value.document,
    payables: created.value.payables,
    by: by(),
    at: new Date('2026-07-10'),
  });
  if (!a.ok) throw new Error('test setup: approve');
  return a.value;
};

describe('financial/domain/document — undoApproval (US5)', () => {
  it('CT-018: desfazer aprovação volta documento e títulos para Open', () => {
    const ap = approved();
    const r = Document.undoApproval({ document: ap.document, payables: ap.payables });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Open');
      assert.equal(r.value.payables.parent.status, 'Open');
      assert.ok(r.value.payables.children.every((c) => c.status === 'Open'));
      assert.ok(r.value.events.some((e) => e.type === 'ApprovalUndone'));
    }
  });

  it('reaproveita os filhos (mesmos valores) ao desfazer sem alterar', () => {
    const ap = approved();
    const before = ap.payables.children.map((c) => c.value.cents).sort((a, b) => a - b);
    const r = Document.undoApproval({ document: ap.document, payables: ap.payables });
    if (r.ok) {
      const after = r.value.payables.children.map((c) => c.value.cents).sort((a, b) => a - b);
      assert.deepEqual(after, before);
    }
  });

  it('CT-019: desfazer + ajustar valores recria os filhos (hard delete)', () => {
    const ap = approved();
    const undone = Document.undoApproval({ document: ap.document, payables: ap.payables });
    if (!undone.ok) throw new Error('undo falhou');
    const adjusted = Document.adjust({
      document: undone.value.document,
      payables: undone.value.payables,
      changes: { retentions: [ret('ISS', 9999)] },
    });
    assert.equal(isOk(adjusted), true);
    if (adjusted.ok) {
      assert.equal(adjusted.value.payables.children.length, 1);
      assert.equal(adjusted.value.payables.children[0]?.value.cents, 9999);
    }
  });
});
