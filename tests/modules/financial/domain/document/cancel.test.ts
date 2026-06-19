import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
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
const ret = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('test setup: retention');
  return r.value;
};

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
  if (!r.ok) throw new Error('test setup: open nfse');
  return r.value;
};

describe('financial/domain/document — cancel (US6)', () => {
  it('CT-022: cancelar documento em Open emite DocumentCancelled com pai + filhos', () => {
    const open = openNfse();
    const r = Document.cancel({ document: open.document, payables: open.payables });
    assert.equal(isOk(r), true);
    if (r.ok) {
      const cancelled = r.value.events.find((e) => e.type === 'DocumentCancelled');
      assert.ok(cancelled);
      if (cancelled?.type === 'DocumentCancelled') {
        assert.equal(cancelled.documentId, open.document.id);
        assert.equal(cancelled.payableIds.length, 4); // 1 pai + 3 filhos (hard delete)
      }
    }
  });

  it('#166: cancelar documento em Draft emite DocumentCancelled sem payables (rascunho nao gera filhos)', () => {
    const draft = Document.saveDraft({ id: DocumentId.generate(), documentNumber: 'NFS-DRAFT' });
    if (!draft.ok) throw new Error('test setup: draft');
    const r = Document.cancelDraft(draft.value.document);
    assert.equal(isOk(r), true);
    if (r.ok) {
      const cancelled = r.value.events.find((e) => e.type === 'DocumentCancelled');
      assert.ok(cancelled);
      if (cancelled?.type === 'DocumentCancelled') {
        assert.equal(cancelled.documentId, draft.value.document.id);
        assert.equal(cancelled.payableIds.length, 0);
      }
    }
  });
});
