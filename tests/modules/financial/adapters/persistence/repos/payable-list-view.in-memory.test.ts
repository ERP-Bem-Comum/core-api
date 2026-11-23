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

// Filtro pela data de EMISSÃO do documento (`issuedFrom`/`issuedTo`). Massa:
//   EARLY — emitido 2026-03-10, vence 2026-07-01, 2 retenções → 3 títulos (pai + ISS + IRRF)
//   LATE  — emitido 2026-05-20, vence 2026-08-01, sem retenção → 1 título
//   NONE  — sem emissão (null), vence 2026-07-01, sem retenção → 1 título
const storedWithIssue = (
  documentNumber: string,
  issueDate: Date | null,
  dueDate: Date,
  retentions: readonly Retention.Retention[],
): LoadedDocument => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber,
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(1000000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [...retentions],
    registeredTaxes: [],
    dueDate,
    issueDate,
  });
  if (!r.ok) throw new Error('setup: create');
  return { document: r.value.document, payables: r.value.payables, version: 0 };
};

const issuedFixture = (): readonly LoadedDocument[] => [
  storedWithIssue('EARLY', new Date('2026-03-10'), new Date('2026-07-01'), [
    ret('ISS', 35000),
    ret('IRRF', 15000),
  ]),
  storedWithIssue('LATE', new Date('2026-05-20'), new Date('2026-08-01'), []),
  storedWithIssue('NONE', null, new Date('2026-07-01'), []),
];

const numbersOf = (items: readonly { documentNumber: string | null }[]): string[] =>
  [...new Set(items.map((i) => i.documentNumber ?? '∅'))].sort();

describe('financial/adapters — payable-list-view.in-memory — filtro por emissão', () => {
  it('sem filtro de emissão: documento sem issueDate continua aparecendo (5 títulos)', async () => {
    const view = createInMemoryPayableListView(issuedFixture);
    const r = await view.findPaged({}, 1, 50);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.total, 5);
    assert.deepEqual(numbersOf(r.value.items), ['EARLY', 'LATE', 'NONE']);
  });

  it('só issuedFrom: issue_date >= issuedFrom (exclui o sem emissão)', async () => {
    const view = createInMemoryPayableListView(issuedFixture);
    const r = await view.findPaged({ issuedFrom: new Date('2026-04-01') }, 1, 50);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.total, 1);
    assert.deepEqual(numbersOf(r.value.items), ['LATE']);
  });

  it('só issuedTo: issue_date <= issuedTo — filhos de retenção herdam a emissão do documento', async () => {
    const view = createInMemoryPayableListView(issuedFixture);
    const r = await view.findPaged({ issuedTo: new Date('2026-04-01') }, 1, 50);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.total, 3); // pai + ISS + IRRF do EARLY
    assert.deepEqual(numbersOf(r.value.items), ['EARLY']);
    assert.equal(r.value.items.filter((i) => i.kind === 'Child').length, 2);
  });

  it('ambos: intervalo inclusivo nos dois extremos', async () => {
    const view = createInMemoryPayableListView(issuedFixture);
    const r = await view.findPaged(
      { issuedFrom: new Date('2026-03-10'), issuedTo: new Date('2026-05-20') },
      1,
      50,
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.total, 4);
    assert.deepEqual(numbersOf(r.value.items), ['EARLY', 'LATE']);
  });

  it('documento com issueDate null é excluído quando qualquer lado do filtro está ativo', async () => {
    const view = createInMemoryPayableListView(issuedFixture);
    const r = await view.findPaged({ issuedFrom: new Date('2000-01-01') }, 1, 50);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.total, 4);
    assert.ok(r.value.items.every((i) => i.issueDate !== null));
  });

  it('issuedFrom posterior a issuedTo → lista vazia (a borda não valida a ordem)', async () => {
    const view = createInMemoryPayableListView(issuedFixture);
    const r = await view.findPaged(
      { issuedFrom: new Date('2026-06-01'), issuedTo: new Date('2026-01-01') },
      1,
      50,
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.total, 0);
    assert.equal(r.value.items.length, 0);
  });

  it('combina em AND com dueFrom/dueTo e status', async () => {
    const view = createInMemoryPayableListView(issuedFixture);
    // LATE passa na emissão mas vence depois; EARLY vence dentro mas foi emitido antes → nenhum.
    const none = await view.findPaged(
      {
        issuedFrom: new Date('2026-04-01'),
        dueFrom: new Date('2026-06-01'),
        dueTo: new Date('2026-07-15'),
      },
      1,
      50,
    );
    assert.equal(none.ok, true);
    if (none.ok) assert.equal(none.value.total, 0);

    const paid = await view.findPaged({ status: 'Paid', issuedTo: new Date('2026-04-01') }, 1, 50);
    assert.equal(paid.ok, true);
    if (paid.ok) assert.equal(paid.value.total, 0);
  });

  it('countByStatus concorda com findPaged para o mesmo filtro de emissão', async () => {
    const view = createInMemoryPayableListView(issuedFixture);
    const filter = { issuedTo: new Date('2026-04-01') };
    const list = await view.findPaged(filter, 1, 50);
    const counts = await view.countByStatus(filter);
    assert.equal(list.ok, true);
    assert.equal(counts.ok, true);
    if (!list.ok || !counts.ok) return;
    assert.equal(counts.value.total, 3);
    assert.equal(counts.value.total, list.value.total);
    assert.equal(counts.value.byStatus['Open'], 3);
  });
});
