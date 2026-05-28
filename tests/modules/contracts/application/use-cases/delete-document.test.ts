/**
 * W0 (RED) - Tests para deleteDocument use case.
 *
 * Ticket: CTR-USECASE-DELETE-DOCUMENT.
 *
 * Cobre CA-DEL1..DEL5:
 *   DEL1 - happy path: ok com document(LogicallyDeleted) + event
 *   DEL2 - documento inexistente -> document-not-found
 *   DEL3 - documento ja deletado -> document-already-deleted
 *   DEL4 - reason vazio -> document-empty-delete-reason (do domain)
 *   DEL5 - repo.save falha -> propagado
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { deleteDocument } from '#src/modules/contracts/application/use-cases/delete-document.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import * as Document from '#src/modules/contracts/domain/document/document.ts';
import type { DocumentRepository } from '#src/modules/contracts/domain/document/repository.ts';
import type { ActiveContractDocument } from '#src/modules/contracts/domain/document/types.ts';
import { ok, err } from '#src/shared/primitives/result.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';

const CONTRACT_UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const buildActive = (): ActiveContractDocument => {
  const r = Document.create({
    id: DocumentId.generate(),
    parentType: 'Contract',
    parentId: fromOk(ContractId.rehydrate(CONTRACT_UUID), 'contractId'),
    categoria: 'signed_contract',
    fileName: 'doc.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    hashSha256: 'e'.repeat(64),
    bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
    storageKey: fromOk(createStorageKey('contracts/2026/doc.pdf'), 'key'),
    signedElectronically: true,
    version: 1,
    uploadedAt: new Date('2026-05-22T10:00:00.000Z'),
    uploadedBy: fromOk(UserRef.rehydrate(USER_UUID), 'userRef'),
    retentionUntil: null,
  });
  return fromOk(r, 'create').document;
};

const setupWorld = async (overrides?: { documentRepo?: DocumentRepository }) => {
  const clock = ClockFixed(new Date('2026-06-15T12:00:00.000Z'));
  const outbox = InMemoryOutbox();
  const documentHandle = InMemoryDocumentRepository(outbox.port);
  const documentRepo = overrides?.documentRepo ?? documentHandle.repo;
  const active = buildActive();
  await documentRepo.save(active, []);
  return {
    deps: { clock, documentRepo },
    outbox,
    active,
    documentHandle,
  };
};

describe('deleteDocument', () => {
  it('CA-DEL1: happy path retorna ok com LogicallyDeleted + event', async () => {
    const { deps, active } = await setupWorld();
    const r = await deleteDocument(deps)({
      documentId: String(active.id),
      deletedReason: 'documento substituido',
      deletedBy: USER_UUID,
    });
    assert.equal(r.ok, true, `esperado ok; obtido: ${JSON.stringify(r)}`);
    if (r.ok) {
      assert.equal(r.value.document.status, 'LogicallyDeleted');
      assert.equal(r.value.document.deletedReason, 'documento substituido');
      assert.equal(r.value.document.deletedAt.toISOString(), '2026-06-15T12:00:00.000Z');
      assert.equal(r.value.event.type, 'ContractDocumentDeleted');
      assert.equal(r.value.event.documentId, active.id);
    }
  });

  it('CA-DEL2: documentId inexistente retorna document-not-found', async () => {
    const { deps } = await setupWorld();
    const phantomId = DocumentId.generate();
    const r = await deleteDocument(deps)({
      documentId: String(phantomId),
      deletedReason: 'motivo',
      deletedBy: USER_UUID,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-not-found');
  });

  it('CA-DEL3: documento ja deletado retorna document-already-deleted', async () => {
    const { deps, active } = await setupWorld();
    // Deleta uma vez
    const first = await deleteDocument(deps)({
      documentId: String(active.id),
      deletedReason: 'primeira exclusao',
      deletedBy: USER_UUID,
    });
    assert.equal(first.ok, true);

    // Tenta deletar de novo
    const second = await deleteDocument(deps)({
      documentId: String(active.id),
      deletedReason: 'segunda tentativa',
      deletedBy: USER_UUID,
    });
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.error, 'document-already-deleted');
  });

  it('CA-DEL4: reason vazio retorna document-empty-delete-reason', async () => {
    const { deps, active } = await setupWorld();
    const r = await deleteDocument(deps)({
      documentId: String(active.id),
      deletedReason: '',
      deletedBy: USER_UUID,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-empty-delete-reason');
  });

  it('CA-DEL5: repo.save falha retorna error propagado', async () => {
    const failingRepo: DocumentRepository = {
      // eslint-disable-next-line @typescript-eslint/require-await
      findById: async (id) => {
        // Retornamos um documento Active para o use case poder progredir
        const active = buildActive();
        const overriddenActive: ActiveContractDocument = { ...active, id: id as typeof active.id };
        return ok(overriddenActive);
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      findByParent: async () => ok([]),
      // eslint-disable-next-line @typescript-eslint/require-await
      save: async () => err('document-repository-unavailable'),
    };
    const { deps, active } = await setupWorld({ documentRepo: failingRepo });
    const r = await deleteDocument(deps)({
      documentId: String(active.id),
      deletedReason: 'motivo',
      deletedBy: USER_UUID,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-repository-unavailable');
  });
});
