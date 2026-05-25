import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk, ok, err } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { createContract } from '#src/modules/contracts/application/use-cases/create-contract.ts';
import { createAmendment } from '#src/modules/contracts/application/use-cases/create-amendment.ts';
import { attachSignedDocument } from '#src/modules/contracts/application/use-cases/attach-signed-document.ts';
import * as Document from '#src/modules/contracts/domain/document/document.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import type { DocumentRepository } from '#src/modules/contracts/domain/document/repository.ts';
import type { ContractDocument } from '#src/modules/contracts/domain/document/types.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';

// W0 RED — CTR-OUTBOX-INTEGRATION-IN-REPOS
// setup usa InMemoryOutbox injetado nos repos.
// deps NÃO contém mais eventBus.
// Assertions de evento inspecionam outbox.all() / outbox.pending().

const USER_UUID_FIXTURE = '66666666-6666-4666-8666-666666666666';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const buildFixtureDocument = (parentId: string, parentType: 'Contract' | 'Amendment') => {
  const parentIdBranded =
    parentType === 'Contract'
      ? fromOk(ContractId.rehydrate(parentId), 'contractId')
      : fromOk(AmendmentId.rehydrate(parentId), 'amendmentId');
  const r = Document.create({
    id: DocumentId.generate(),
    parentType,
    parentId: parentIdBranded,
    categoria: 'signed_amendment',
    fileName: 'signed.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 5,
    hashSha256: 'a'.repeat(64),
    bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
    storageKey: fromOk(createStorageKey('contracts/2026/signed.pdf'), 'key'),
    signedElectronically: true,
    version: 1,
    uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
    uploadedBy: fromOk(UserRef.rehydrate(USER_UUID_FIXTURE), 'userRef'),
    retentionUntil: null,
  });
  return fromOk(r, 'document').document;
};

const setupWithAmendment = async () => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const amendmentRepo = InMemoryAmendmentRepository(outbox.port);
  const documentRepo = InMemoryDocumentRepository(outbox.port);
  const clock = ClockFixed(new Date('2026-03-01'));

  const contract = await createContract({
    contractRepo: contractRepo.repo,
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

  const amendment = await createAmendment({
    contractRepo: contractRepo.repo,
    amendmentRepo: amendmentRepo.repo,
    clock,
  })({
    contractId: contract.value.contract.id as unknown as string,
    amendmentNumber: 'AD 01-001/2026',
    description: 'X',
    kind: 'Addition',
    impactValueCents: 500000,
  });
  if (!amendment.ok) throw new Error('fixture broken');

  // Cria documento fixture vinculado ao amendment (CTR-AMENDMENT-DOCUMENT-LINK).
  const fixtureDoc = buildFixtureDocument(
    amendment.value.amendment.id as unknown as string,
    'Amendment',
  );
  await documentRepo.repo.save(fixtureDoc, []);

  // Limpa o outbox após setup para isolar eventos do teste
  outbox.clear();

  return {
    contract: contract.value.contract,
    amendment: amendment.value.amendment,
    fixtureDoc,
    contractRepo,
    amendmentRepo,
    documentRepo,
    outbox,
    deps: { amendmentRepo: amendmentRepo.repo, documentRepo: documentRepo.repo },
  };
};

describe('attachSignedDocument — happy path', () => {
  it('CA-L1: attaches document existente no repo + appends event to outbox', async () => {
    const w = await setupWithAmendment();
    const r = await attachSignedDocument(w.deps)({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: w.fixtureDoc.id as unknown as string,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.signedDocumentRef, w.fixtureDoc.id);
    assert.equal(r.value.event.type, 'AmendmentDocumentAttached');
    assert.equal(w.outbox.all().length, 1);
    assert.equal(w.outbox.all()[0]?.eventType, 'AmendmentDocumentAttached');

    const persisted = await w.amendmentRepo.repo.findById(w.amendment.id);
    if (!persisted.ok || persisted.value === null) {
      throw new Error('amendment not persisted');
    }
    assert.equal(persisted.value.signedDocumentRef, w.fixtureDoc.id);
  });
});

describe('attachSignedDocument — document existence (CTR-AMENDMENT-DOCUMENT-LINK)', () => {
  it('CA-L2: documentId formato valido mas inexistente retorna signed-document-not-found', async () => {
    const w = await setupWithAmendment();
    const phantomDocId = DocumentId.generate();
    const r = await attachSignedDocument(w.deps)({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: phantomDocId as unknown as string,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'signed-document-not-found');
  });

  it('CA-L3: documentRepo.findById falha propaga document-repository-unavailable', async () => {
    const w = await setupWithAmendment();
    const failingDocRepo: DocumentRepository = {
      // eslint-disable-next-line @typescript-eslint/require-await
      findById: async () => err('document-repository-unavailable'),
      // eslint-disable-next-line @typescript-eslint/require-await
      findByParent: async () => ok([]),
      // eslint-disable-next-line @typescript-eslint/require-await
      save: async (_doc: ContractDocument, _events: readonly ContractsModuleEvent[]) =>
        ok(undefined),
    };
    const r = await attachSignedDocument({
      amendmentRepo: w.amendmentRepo.repo,
      documentRepo: failingDocRepo,
    })({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: w.fixtureDoc.id as unknown as string,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-repository-unavailable');
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
    // 1º attach com fixtureDoc (existe no repo)
    await attachSignedDocument(w.deps)({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: w.fixtureDoc.id as unknown as string,
    });
    // 2º attach: cria segundo documento fixture e tenta de novo no mesmo amendment
    const doc2 = buildFixtureDocument(w.amendment.id as unknown as string, 'Amendment');
    await w.documentRepo.repo.save(doc2, []);
    const r = await attachSignedDocument(w.deps)({
      amendmentId: w.amendment.id as unknown as string,
      signedDocumentRef: doc2.id as unknown as string,
    });
    assert.equal(isErr(r), true);
    // CTR-DOMAIN-TAGGED-ERRORS — `AmendmentError` virou tagged record (D22).
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'AmendmentDocumentAlreadyAttached');
    }
  });
});
