import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/amendment-repository.in-memory.ts';
import { InMemoryEventBus } from '#src/modules/contracts/adapters/event-bus.in-memory.ts';
import { createContract } from '#src/modules/contracts/application/use-cases/create-contract.ts';
import { createAmendment } from '#src/modules/contracts/application/use-cases/create-amendment.ts';
import { attachSignedDocument } from '#src/modules/contracts/application/use-cases/attach-signed-document.ts';
import { AmendmentId, DocumentId } from '#src/modules/contracts/domain/shared/ids.ts';

const setupWithAmendment = async () => {
  const contractRepo = InMemoryContractRepository();
  const amendmentRepo = InMemoryAmendmentRepository();
  const eventBus = InMemoryEventBus();
  const clock = ClockFixed(new Date('2026-03-01'));
  const baseDeps = {
    contractRepo: contractRepo.repo,
    amendmentRepo: amendmentRepo.repo,
    eventBus: eventBus.bus,
    clock,
  };

  const contract = await createContract({
    contractRepo: contractRepo.repo,
    eventBus: eventBus.bus,
    clock,
  })({
    sequentialNumber: '001/2026',
    title: 'X',
    objective: 'O',
    signedAt: '2026-01-01',
    originalValueCents: 10000000,
    originalPeriodStart: '2026-01-01',
    originalPeriodEnd: '2026-12-31',
  });
  if (!contract.ok) throw new Error('fixture broken');

  const amendment = await createAmendment(baseDeps)({
    contractId: contract.value.contract.id as unknown as string,
    amendmentNumber: 'AD 01-001/2026',
    description: 'X',
    kind: 'Addition',
    impactValueCents: 500000,
  });
  if (!amendment.ok) throw new Error('fixture broken');

  eventBus.clear();

  return {
    contract: contract.value.contract,
    amendment: amendment.value.amendment,
    contractRepo,
    amendmentRepo,
    eventBus,
    deps: { amendmentRepo: amendmentRepo.repo, eventBus: eventBus.bus },
  };
};

describe('attachSignedDocument — happy path', () => {
  it('attaches document to Pending amendment', async () => {
    const w = await setupWithAmendment();
    const docId = DocumentId.generate();
    const r = await attachSignedDocument(w.deps)({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: docId as unknown as string,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.signedDocumentRef, docId);
    assert.equal(r.value.event.type, 'AmendmentDocumentAttached');
    assert.equal(w.eventBus.published().length, 1);

    const persisted = await w.amendmentRepo.repo.findById(w.amendment.id);
    if (!persisted.ok || persisted.value === null) {
      throw new Error('amendment not persisted');
    }
    assert.equal(persisted.value.signedDocumentRef, docId);
  });
});

describe('attachSignedDocument — validations', () => {
  it('rejects invalid amendmentId', async () => {
    const w = await setupWithAmendment();
    const r = await attachSignedDocument(w.deps)({
      amendmentId: 'not-a-uuid',
      signedDocumentRef: DocumentId.generate() as unknown as string,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-id-invalid');
  });

  it('rejects invalid signedDocumentRef', async () => {
    const w = await setupWithAmendment();
    const r = await attachSignedDocument(w.deps)({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: 'not-a-uuid',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-id-invalid');
  });

  it('returns amendment-not-found when amendment does not exist', async () => {
    const w = await setupWithAmendment();
    const r = await attachSignedDocument(w.deps)({
      amendmentId: AmendmentId.generate() as unknown as string,
      signedDocumentRef: DocumentId.generate() as unknown as string,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-not-found');
  });

  it('propagates amendment-document-already-attached', async () => {
    const w = await setupWithAmendment();
    const docId = DocumentId.generate();
    await attachSignedDocument(w.deps)({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: docId as unknown as string,
    });
    const r = await attachSignedDocument(w.deps)({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: DocumentId.generate() as unknown as string,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-document-already-attached');
  });
});
