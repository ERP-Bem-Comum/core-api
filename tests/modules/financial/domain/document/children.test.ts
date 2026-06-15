import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as RegisteredTax from '#src/modules/financial/domain/shared/registered-tax.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('test setup: supplier');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF' | 'INSS' | 'CSRF', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('test setup: retention');
  return r.value;
};
const regTax = (
  type: 'ICMS' | 'IPI' | 'PIS' | 'COFINS',
  valueCents: number,
): RegisteredTax.RegisteredTax => {
  const r = RegisteredTax.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('test setup: registered-tax');
  return r.value;
};

const base = (type: Document.CreateDocumentInput['type']): Document.CreateDocumentInput => ({
  id: DocumentId.generate(),
  documentNumber: 'DOC-001',
  type,
  supplier: supplier(),
  paymentMethod: 'TED',
  grossValue: money(100000),
  sourceDiscounts: Money.ZERO,
  discounts: Money.ZERO,
  penalty: Money.ZERO,
  interest: Money.ZERO,
  retentions: [],
  registeredTaxes: [],
  dueDate: new Date('2026-07-01'),
});

describe('financial/domain/document — geração de filhos (US2)', () => {
  it('CT-003: NFS-e com retenções gera pai (líquido) + 1 filho por retenção', () => {
    const r = Document.create({
      ...base('NFS-e'),
      sourceDiscounts: money(5000),
      retentions: [ret('ISS', 5000), ret('IRRF', 1500), ret('INSS', 11000)],
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.payables.parent.value.cents, 77500);
      assert.equal(r.value.payables.children.length, 3);
      const iss = r.value.payables.children.find((c) => c.retentionType === 'ISS');
      assert.ok(iss);
      assert.equal(iss?.kind, 'Child');
      assert.equal(iss?.value.cents, 5000);
      assert.equal(iss?.status, 'Open');
      assert.equal(iss?.dueDate.getTime(), r.value.payables.parent.dueDate.getTime());
    }
  });

  it('CT-005: RPA gera filhos IRRF/INSS/CSRF', () => {
    const r = Document.create({
      ...base('RPA'),
      retentions: [ret('IRRF', 1500), ret('INSS', 11000), ret('CSRF', 4650)],
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.payables.children.length, 3);
      const types = r.value.payables.children.map((c) => c.retentionType).sort();
      assert.deepEqual(types, ['CSRF', 'INSS', 'IRRF']);
    }
  });

  it('CT-006: DANFE com impostos registrados → só pai, 0 filhos', () => {
    const r = Document.create({
      ...base('DANFE'),
      grossValue: money(500000),
      registeredTaxes: [regTax('ICMS', 90000), regTax('IPI', 25000)],
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.payables.children.length, 0);
      assert.equal(r.value.payables.parent.value.cents, 500000); // registrados não abatem
    }
  });

  it('CT-009: retenção em documento não-fiscal (Boleto) é rejeitada', () => {
    const r = Document.create({ ...base('Boleto'), retentions: [ret('ISS', 5000)] });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'retention-not-allowed-for-type');
  });

  it('RPA com ISS é rejeitada (ISS só existe em NFS-e)', () => {
    const r = Document.create({ ...base('RPA'), retentions: [ret('ISS', 5000)] });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'retention-not-allowed-for-type');
  });
});
