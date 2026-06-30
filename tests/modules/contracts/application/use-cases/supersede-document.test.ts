/**
 * W0 (RED) - Tests para supersedeDocument use case.
 *
 * Ticket: CTR-USECASE-SUPERSEDE-DOCUMENT.
 *
 * Cobre CA-SUP1..SUP6:
 *   SUP1 - happy path -> ok com Superseded
 *   SUP2 - documentId inexistente -> document-not-found
 *   SUP3 - supersededByDocumentId inexistente -> supersede-target-not-found
 *   SUP4 - documento ja deletado -> document-already-deleted
 *   SUP5 - documento ja substituido -> document-already-superseded
 *   SUP6 - byDocId === documentId -> document-supersede-self (do domain)
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { supersedeDocument } from '#src/modules/contracts/application/use-cases/supersede-document.ts';
import { deleteDocument } from '#src/modules/contracts/application/use-cases/delete-document.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import * as Document from '#src/modules/contracts/domain/document/document.ts';
import type { ActiveContractDocument } from '#src/modules/contracts/domain/document/types.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';

const CONTRACT_UUID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_UUID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const buildActive = (suffix: string): ActiveContractDocument => {
  const r = Document.create({
    id: DocumentId.generate(),
    parentType: 'Contract',
    parentId: fromOk(ContractId.rehydrate(CONTRACT_UUID), 'contractId'),
    categoria: 'signed_contract',
    fileName: `doc-${suffix}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 100,
    hashSha256: 'f'.repeat(64),
    bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
    storageKey: fromOk(createStorageKey(`contracts/2026/doc-${suffix}.pdf`), 'key'),
    signedElectronically: true,
    version: 1,
    uploadedAt: new Date('2026-05-22T10:00:00.000Z'),
    uploadedBy: fromOk(UserRef.rehydrate(USER_UUID), 'userRef'),
    retentionUntil: null,
  });
  return fromOk(r, 'create').document;
};

const setupWorld = async () => {
  const clock = ClockFixed(new Date('2026-07-01T12:00:00.000Z'));
  const outbox = InMemoryOutbox();
  const documentHandle = InMemoryDocumentRepository(outbox.port);
  const old = buildActive('old');
  const newer = buildActive('newer');
  await documentHandle.repo.save(old, []);
  await documentHandle.repo.save(newer, []);
  return {
    deps: { clock, documentRepo: documentHandle.repo },
    old,
    newer,
  };
};

describe('supersedeDocument', () => {
  it('CA-SUP1: happy path retorna ok com Superseded + event', async () => {
    const { deps, old, newer } = await setupWorld();
    const r = await supersedeDocument(deps)({
      documentId: String(old.id),
      supersededByDocumentId: String(newer.id),
      supersededBy: USER_UUID,
    });
    assert.equal(r.ok, true, `esperado ok; obtido: ${JSON.stringify(r)}`);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Superseded');
      assert.equal(r.value.document.supersededByDocumentId, newer.id);
      assert.equal(r.value.event.type, 'ContractDocumentSuperseded');
    }
  });

  it('CA-SUP2: documentId inexistente retorna document-not-found', async () => {
    const { deps, newer } = await setupWorld();
    const phantom = DocumentId.generate();
    const r = await supersedeDocument(deps)({
      documentId: String(phantom),
      supersededByDocumentId: String(newer.id),
      supersededBy: USER_UUID,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-not-found');
  });

  it('CA-SUP3: supersededByDocumentId inexistente retorna supersede-target-not-found', async () => {
    const { deps, old } = await setupWorld();
    const phantom = DocumentId.generate();
    const r = await supersedeDocument(deps)({
      documentId: String(old.id),
      supersededByDocumentId: String(phantom),
      supersededBy: USER_UUID,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'supersede-target-not-found');
  });

  it('CA-SUP4: documento ja deletado retorna document-already-deleted', async () => {
    const { deps, old, newer } = await setupWorld();
    const del = await deleteDocument(deps)({
      documentId: String(old.id),
      deletedReason: 'pre-delete',
      deletedBy: USER_UUID,
    });
    assert.equal(del.ok, true);
    const r = await supersedeDocument(deps)({
      documentId: String(old.id),
      supersededByDocumentId: String(newer.id),
      supersededBy: USER_UUID,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-already-deleted');
  });

  it('CA-SUP5: documento ja substituido retorna document-already-superseded', async () => {
    const { deps, old, newer } = await setupWorld();
    const first = await supersedeDocument(deps)({
      documentId: String(old.id),
      supersededByDocumentId: String(newer.id),
      supersededBy: USER_UUID,
    });
    assert.equal(first.ok, true);
    const second = await supersedeDocument(deps)({
      documentId: String(old.id),
      supersededByDocumentId: String(newer.id),
      supersededBy: USER_UUID,
    });
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.error, 'document-already-superseded');
  });

  it('CA-SUP6: byDocId === documentId propaga document-supersede-self', async () => {
    const { deps, old } = await setupWorld();
    const r = await supersedeDocument(deps)({
      documentId: String(old.id),
      supersededByDocumentId: String(old.id),
      supersededBy: USER_UUID,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-supersede-self');
  });
});
