/**
 * W0 RED — FIN-PAYABLE-DUEDATE-ISOLATED (#270). Use-case `updatePayableDueDate`: findById → domínio
 * (`Document.updatePayableDueDate`) → save (optimistic lock). RED por inexistência do módulo.
 *
 * CA1: persiste a alteração isolada (só o título alvo; pai/irmãos/documento inalterados).
 * CA3: documento inexistente → document-not-found; título não-pertencente → payable-not-found.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId, PayableId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';
import { updatePayableDueDate } from '#src/modules/financial/application/use-cases/update-payable-due-date.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const ORIGINAL_DUE = new Date('2026-07-01');
const NEW_DUE = new Date('2027-03-15');
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));

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
    documentNumber: 'NFS-270',
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
    dueDate: ORIGINAL_DUE,
  });
  if (!r.ok) throw new Error('setup create');
  return r.value;
};

const makeRepo = (): DocumentRepository => {
  const outbox = createInMemoryOutbox();
  return createInMemoryDocumentRepository(undefined, undefined, outbox.port);
};
const seedOpen = async (repo: DocumentRepository) => {
  const c = createdNfse();
  await repo.save({ document: c.document, payables: c.payables }, []);
  return c.document.id;
};
const iso = (d: Date): string => d.toISOString();

describe('financial/application — updatePayableDueDate (#270)', () => {
  it('CA1: altera só o título alvo e persiste; pai/irmãos/documento inalterados', async () => {
    const repo = makeRepo();
    const id = await seedOpen(repo);
    const found0 = await repo.findById(id);
    assert.equal(found0.ok, true);
    if (!found0.ok || found0.value.payables === null) return assert.fail('setup reload');
    const child = found0.value.payables.children[0]!;

    const r = await updatePayableDueDate({ repo, clock: CLOCK })({
      documentId: String(id),
      payableId: String(child.id),
      expectedVersion: 0,
      dueDate: NEW_DUE,
    });
    assert.equal(r.ok, true, JSON.stringify(r));

    const found = await repo.findById(id);
    if (!found.ok || found.value.payables === null) return assert.fail('reload');
    const reChild = found.value.payables.children.find((c) => c.id === child.id)!;
    assert.equal(iso(reChild.dueDate), iso(NEW_DUE), 'alvo alterado e persistido');
    assert.equal(iso(found.value.payables.parent.dueDate), iso(ORIGINAL_DUE), 'pai inalterado');
    for (const c of found.value.payables.children) {
      if (c.id === child.id) continue;
      assert.equal(iso(c.dueDate), iso(ORIGINAL_DUE), 'irmão inalterado');
    }
    assert.equal(iso(found.value.document.dueDate!), iso(ORIGINAL_DUE), 'documento inalterado');
  });

  it('CA3: documento inexistente → document-not-found', async () => {
    const repo = makeRepo();
    const r = await updatePayableDueDate({ repo, clock: CLOCK })({
      documentId: String(DocumentId.generate()),
      payableId: String(PayableId.generate()),
      expectedVersion: 0,
      dueDate: NEW_DUE,
    });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'document-not-found');
  });

  it('CA3: título não pertencente ao documento → payable-not-found', async () => {
    const repo = makeRepo();
    const id = await seedOpen(repo);
    const r = await updatePayableDueDate({ repo, clock: CLOCK })({
      documentId: String(id),
      payableId: String(PayableId.generate()),
      expectedVersion: 0,
      dueDate: NEW_DUE,
    });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'payable-not-found');
  });
});
