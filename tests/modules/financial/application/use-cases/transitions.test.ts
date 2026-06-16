import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';
import { approveDocument } from '#src/modules/financial/application/use-cases/approve-document.ts';
import { undoApproval } from '#src/modules/financial/application/use-cases/undo-approval.ts';
import { cancelDocument } from '#src/modules/financial/application/use-cases/cancel-document.ts';
import { submitDraft } from '#src/modules/financial/application/use-cases/submit-draft.ts';

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

const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));

const seedOpen = async (repo: DocumentRepository): Promise<string> => {
  const c = createdNfse();
  await repo.save({ document: c.document, payables: c.payables }, []);
  return c.document.id;
};
const seedApproved = async (repo: DocumentRepository): Promise<string> => {
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
  await repo.save({ document: a.value.document, payables: a.value.payables }, []);
  return a.value.document.id;
};
const seedDraft = async (repo: DocumentRepository): Promise<string> => {
  const d = Document.saveDraft({
    id: DocumentId.generate(),
    documentNumber: 'BOL-1',
    type: 'Boleto',
    supplier: supplier(),
    paymentMethod: 'PIX',
    grossValue: money(100000),
    dueDate: new Date('2026-07-01'),
  });
  if (!d.ok) throw new Error('setup draft');
  await repo.save({ document: d.value.document, payables: null }, []);
  return d.value.document.id;
};

describe('financial/application — approveDocument', () => {
  it('aprova um documento Open (pai+filhos Approved) e publica eventos', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedOpen(repo);
    const r = await approveDocument({
      repo,
      outbox: outbox.port,
      clock: ClockFixed(new Date('2026-07-10')),
    })({
      documentId: id,
      approvedBy: USER,
      expectedVersion: 0,
    });
    assert.equal(isOk(r), true);
    const found = await repo.findById(id as never);
    if (found.ok) {
      assert.equal(found.value.document.status, 'Approved');
      assert.ok(found.value.payables?.children.every((c) => c.status === 'Approved'));
    }
    assert.ok(outbox.all().some((e) => e.type === 'PayableApproved'));
  });

  it('rejeita aprovar um documento que não está Open (Draft) — invalid-state-transition', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedDraft(repo);
    const r = await approveDocument({
      repo,
      outbox: outbox.port,
      clock: ClockFixed(new Date('2026-07-10')),
    })({
      documentId: id,
      approvedBy: USER,
      expectedVersion: 0,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-state-transition');
  });
});

describe('financial/application — undoApproval', () => {
  it('desfaz a aprovação de um documento Approved (volta a Open)', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedApproved(repo);
    const r = await undoApproval({ repo, outbox: outbox.port, clock: CLOCK })({
      documentId: id,
      expectedVersion: 0,
    });
    assert.equal(isOk(r), true);
    const found = await repo.findById(id as never);
    if (found.ok) assert.equal(found.value.document.status, 'Open');
  });
});

describe('financial/application — cancelDocument', () => {
  it('cancela um documento Open (hard delete) e publica DocumentCancelled', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedOpen(repo);
    const r = await cancelDocument({ repo, outbox: outbox.port })({
      documentId: id,
      expectedVersion: 0,
    });
    assert.equal(isOk(r), true);
    const found = await repo.findById(id as never);
    assert.equal(found.ok, false); // removido
    assert.ok(outbox.all().some((e) => e.type === 'DocumentCancelled'));
  });

  it('rejeita cancelar um documento Approved — invalid-state-transition', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedApproved(repo);
    const r = await cancelDocument({ repo, outbox: outbox.port })({
      documentId: id,
      expectedVersion: 1,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-state-transition');
  });

  it('rejeita cancelar com versão defasada — document-version-conflict (#55)', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedOpen(repo); // v0
    const r = await cancelDocument({ repo, outbox: outbox.port })({
      documentId: id,
      expectedVersion: 999,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-version-conflict');
    const found = await repo.findById(id as never);
    assert.equal(found.ok, true); // permanece (não apagado)
  });
});

describe('financial/application — submitDraft', () => {
  it('submete um rascunho completo (Draft → Open) e gera títulos', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const id = await seedDraft(repo);
    const r = await submitDraft({ repo, outbox: outbox.port, clock: CLOCK })({ documentId: id });
    assert.equal(isOk(r), true);
    const found = await repo.findById(id as never);
    if (found.ok) {
      assert.equal(found.value.document.status, 'Open');
      assert.equal(found.value.payables?.parent.value.cents, 100000);
    }
  });
});
