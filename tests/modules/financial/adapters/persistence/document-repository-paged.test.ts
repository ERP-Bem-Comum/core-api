import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';

// W0 RED (US1): `findPaged` ainda NÃO existe no port DocumentRepository nem no adapter (T006/T014).

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};
const supplierRef = (uuid: string): SupplierRef => {
  const r = SupplierRef.rehydrate(uuid);
  if (!r.ok) throw new Error('test setup: supplier');
  return r.value;
};
const SUP_A = '11111111-1111-4111-8111-111111111111';
const SUP_B = '22222222-2222-4222-8222-222222222222';

const openDoc = (sup: string, due: string): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: `NFS-${due}`,
    type: 'NFS-e',
    supplier: supplierRef(sup),
    paymentMethod: 'TED',
    grossValue: money(100000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [],
    registeredTaxes: [],
    dueDate: new Date(due),
  });
  if (!r.ok) throw new Error('test setup: open doc');
  return r.value;
};

describe('financial/adapters/persistence/document-repository — findPaged (US1)', () => {
  it('CT-001: filtra por status Open', async () => {
    const repo = createInMemoryDocumentRepository();
    const a = openDoc(SUP_A, '2026-07-01');
    await repo.save({ document: a.document, payables: a.payables });
    const draft = Document.saveDraft({ id: DocumentId.generate(), documentNumber: 'D-1' });
    if (!draft.ok) throw new Error('saveDraft');
    await repo.save({ document: draft.value.document, payables: null });

    const page = await repo.findPaged({ status: 'Open' }, 1, 10);
    assert.equal(page.ok, true);
    if (page.ok) {
      assert.equal(page.value.total, 1);
      assert.equal(page.value.items.length, 1);
      assert.equal(page.value.items[0]?.status, 'Open');
    }
  });

  it('CT-002: pagina (page 2, pageSize 2 de 5 itens)', async () => {
    const repo = createInMemoryDocumentRepository();
    for (let i = 0; i < 5; i++) {
      const d = openDoc(SUP_A, `2026-08-0${String(i + 1)}`);
      await repo.save({ document: d.document, payables: d.payables });
    }
    const page = await repo.findPaged({ status: 'Open' }, 2, 2);
    assert.equal(page.ok, true);
    if (page.ok) {
      assert.equal(page.value.total, 5);
      assert.equal(page.value.page, 2);
      assert.equal(page.value.pageSize, 2);
      assert.equal(page.value.items.length, 2);
    }
  });

  it('CT-003: filtra por supplierRef', async () => {
    const repo = createInMemoryDocumentRepository();
    const a = openDoc(SUP_A, '2026-07-01');
    const b = openDoc(SUP_B, '2026-07-02');
    await repo.save({ document: a.document, payables: a.payables });
    await repo.save({ document: b.document, payables: b.payables });

    const page = await repo.findPaged({ supplierRef: SUP_B }, 1, 10);
    assert.equal(page.ok, true);
    if (page.ok) assert.equal(page.value.total, 1);
  });

  it('CT-005: conjunto vazio → total 0, sem erro', async () => {
    const repo = createInMemoryDocumentRepository();
    const page = await repo.findPaged({ status: 'Approved' }, 1, 10);
    assert.equal(page.ok, true);
    if (page.ok) {
      assert.equal(page.value.total, 0);
      assert.equal(page.value.items.length, 0);
    }
  });
});
