import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
// W0 RED: agregado Document ainda não existe.
import * as Document from '#src/modules/financial/domain/document/document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';

const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('test setup: supplier');
  return r.value;
};

// Input de DOMÍNIO (VOs já construídos; a borda/use case faz a tradução de primitivos).
const baseInput = (): Document.CreateDocumentInput => ({
  id: DocumentId.generate(),
  documentNumber: 'BOL-001',
  type: 'Boleto',
  supplier: supplier(),
  paymentMethod: 'Boleto',
  grossValue: Money.fromCents(100000).value as Money.Money,
  sourceDiscounts: Money.ZERO,
  discounts: Money.ZERO,
  penalty: Money.ZERO,
  interest: Money.ZERO,
  retentions: [],
  registeredTaxes: [],
  dueDate: new Date('2026-07-01'),
});

describe('financial/domain/document — create (US1: documento não-fiscal)', () => {
  it('CT-001: Boleto sem retenções gera 1 título pai em Open, sem filhos', () => {
    const r = Document.create(baseInput());
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Open');
      assert.equal(r.value.payables.parent.kind, 'Parent');
      assert.equal(r.value.payables.parent.value.cents, 100000);
      assert.equal(r.value.payables.children.length, 0);
      assert.ok(r.value.events.some((e) => e.type === 'DocumentSaved'));
    }
  });

  it('CT-002: desconto comercial reduz o líquido do título pai', () => {
    const r = Document.create({
      ...baseInput(),
      type: 'Fatura',
      grossValue: Money.fromCents(500000).value as Money.Money,
      discounts: Money.fromCents(20000).value as Money.Money,
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.payables.parent.value.cents, 480000);
  });

  it('título pai e documento compartilham o status Open ao nascer', () => {
    const r = Document.create(baseInput());
    if (r.ok) assert.equal(r.value.payables.parent.status, r.value.document.status);
  });
});
