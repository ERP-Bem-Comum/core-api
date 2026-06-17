/**
 * FIN-SUPPLIER-VIEW-LIST-DTO · W0 — findPaged resolve fornecedor pelo read-model local (US2 #47).
 * DEVE FALHAR até o in-memory document repo aceitar um SupplierViewStore e enriquecer os itens.
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemorySupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.in-memory.ts';

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
const openDoc = (): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1',
    type: 'NFS-e',
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
  if (!r.ok) throw new Error('test setup: create');
  return r.value;
};

describe('findPaged in-memory — fornecedor resolvido via read-model (US2)', () => {
  it('enriquece supplierName/document quando o read-model tem o supplierRef', async () => {
    const viewStore = createInMemorySupplierViewStore();
    await viewStore.upsert({
      supplierRef: SUP,
      name: 'Gráfica Boa Impressão',
      document: '11222333000181',
      occurredAt: new Date('2026-06-16T12:00:00.000Z'),
    });
    const repo = createInMemoryDocumentRepository(undefined, viewStore);
    const doc = openDoc();
    await repo.save({ document: doc.document, payables: doc.payables }, []);

    const r = await repo.findPaged({}, 1, 10);
    assert.equal(isOk(r), true);
    if (r.ok) {
      const item = r.value.items[0];
      assert.equal(item?.supplierName, 'Gráfica Boa Impressão');
      assert.equal(item?.supplierDocument, '11222333000181');
    }
  });

  it('supplierName/document null quando o supplierRef não está no read-model', async () => {
    const viewStore = createInMemorySupplierViewStore();
    const repo = createInMemoryDocumentRepository(undefined, viewStore);
    const doc = openDoc();
    await repo.save({ document: doc.document, payables: doc.payables }, []);

    const r = await repo.findPaged({}, 1, 10);
    if (r.ok) {
      const item = r.value.items[0];
      assert.equal(item?.supplierName, null);
      assert.equal(item?.supplierDocument, null);
    }
  });
});
