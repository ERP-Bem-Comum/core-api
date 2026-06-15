import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';
import { adjustDocument } from '#src/modules/financial/application/use-cases/adjust-document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('setup money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('setup supplier');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('setup retention');
  return r.value;
};
const createdNfse = (): Document.CreateDocumentOutput => {
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
  if (!r.ok) throw new Error('setup create');
  return r.value;
};
const seedOpen = async (repo: DocumentRepository) => {
  const c = createdNfse();
  await repo.save({ document: c.document, payables: c.payables });
  return c.document.id;
};
const seedApproved = async (repo: DocumentRepository) => {
  const c = createdNfse();
  const by = UserRef.rehydrate(USER);
  if (!by.ok) throw new Error('setup user-ref');
  const a = Document.approve({
    document: c.document,
    payables: c.payables,
    by: by.value,
    at: new Date('2026-07-10'),
  });
  if (!a.ok) throw new Error('setup approve');
  await repo.save({ document: a.value.document, payables: a.value.payables });
  return a.value.document.id;
};

describe('financial/application — adjustDocument', () => {
  it('ajusta um documento Open: recalcula o líquido e regenera os filhos', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedOpen(repo);
    const r = await adjustDocument({ repo, outbox: outbox.port })({
      documentId: id,
      interestCents: 500,
      retentions: [
        { type: 'ISS', baseCents: 40000, rateBps: 1000, valueCents: 4000 },
        { type: 'IRRF', baseCents: 15000, rateBps: 1000, valueCents: 1500 },
        { type: 'INSS', baseCents: 110000, rateBps: 1000, valueCents: 11000 },
      ],
    });
    assert.equal(isOk(r), true);
    const found = await repo.findById(id);
    if (found.ok) assert.equal(found.value.payables?.parent.value.cents, 79000); // 100000-5000-16500+500
  });

  it('rejeita ajustar documento não-Open (Approved) — invalid-state-transition', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedApproved(repo);
    const r = await adjustDocument({ repo, outbox: outbox.port })({
      documentId: id,
      interestCents: 100,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-state-transition');
  });
});
