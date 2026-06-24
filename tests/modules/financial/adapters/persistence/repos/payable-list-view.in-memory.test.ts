import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import type { LoadedDocument } from '#src/modules/financial/domain/document/repository.ts';
import { createInMemoryPayableListView } from '#src/modules/financial/adapters/persistence/repos/payable-list-view.in-memory.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('setup: supplier');
  return r.value;
};
const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('setup: money');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('setup: retention');
  return r.value;
};

const storedNfse = (): LoadedDocument => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NF-123',
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
  if (!r.ok) throw new Error('setup: create');
  return { document: r.value.document, payables: r.value.payables, version: 0 };
};

describe('financial/adapters — payable-list-view.in-memory (#221)', () => {
  it('CA2: pai + filhos como itens distintos, cada um com status/kind próprios', async () => {
    const view = createInMemoryPayableListView(() => [storedNfse()]);
    const r = await view.findPaged({}, 1, 50);
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(r.value.total, 3); // 1 pai + 2 filhos
    const parents = r.value.items.filter((i) => i.kind === 'Parent');
    const children = r.value.items.filter((i) => i.kind === 'Child');
    assert.equal(parents.length, 1);
    assert.equal(children.length, 2);
    assert.ok(r.value.items.every((i) => i.documentNumber === 'NF-123'));
    assert.ok(r.value.items.every((i) => i.status === 'Open'));
    assert.equal(parents[0]?.retentionType, null);
    assert.ok(children.every((c) => c.retentionType !== null));
  });

  it('CA3: filtro por status + paginação', async () => {
    const view = createInMemoryPayableListView(() => [storedNfse()]);

    const open = await view.findPaged({ status: 'Open' }, 1, 50);
    assert.equal(open.ok, true);
    if (open.ok) assert.equal(open.value.total, 3);

    const paid = await view.findPaged({ status: 'Paid' }, 1, 50);
    assert.equal(paid.ok, true);
    if (paid.ok) assert.equal(paid.value.total, 0);

    const p1 = await view.findPaged({}, 1, 2);
    assert.equal(p1.ok, true);
    if (p1.ok) {
      assert.equal(p1.value.items.length, 2);
      assert.equal(p1.value.total, 3);
    }
  });
});
