import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
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

const openBoleto = (): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'BOL-1',
    type: 'Boleto',
    supplier: supplier(),
    paymentMethod: 'PIX',
    grossValue: money(100000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!r.ok) throw new Error('test setup: open boleto');
  return r.value;
};

describe('financial/domain/document — adjust (US4: ajuste em Aberto)', () => {
  it('CT-016: ajustar ISS e juros recalcula o líquido e o filho ISS', () => {
    const open = openNfse();
    const r = Document.adjust({
      document: open.document,
      payables: open.payables,
      changes: {
        retentions: [ret('ISS', 4000), ret('IRRF', 1500), ret('INSS', 11000)],
        interest: money(500),
      },
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Open');
      assert.equal(r.value.document.netValue.cents, 79000); // 100000-5000-16500+500
      assert.equal(r.value.payables.parent.value.cents, 79000);
      const iss = r.value.payables.children.find((c) => c.retentionType === 'ISS');
      assert.equal(iss?.value.cents, 4000);
    }
  });

  it('regenera os filhos conforme as novas retenções (count)', () => {
    const open = openNfse();
    const r = Document.adjust({
      document: open.document,
      payables: open.payables,
      changes: { retentions: [ret('IRRF', 1500)] },
    });
    if (r.ok) assert.equal(r.value.payables.children.length, 1);
  });

  it('rejeita retenção inválida para o tipo ao ajustar (Boleto + ISS)', () => {
    const open = openBoleto();
    const r = Document.adjust({
      document: open.document,
      payables: open.payables,
      changes: { retentions: [ret('ISS', 5000)] },
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'retention-not-allowed-for-type');
  });
});
