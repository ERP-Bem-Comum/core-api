/**
 * W0 (RED) - Tests para Document.logicallyDelete.
 *
 * Ticket: CTR-DOCUMENT-LIFECYCLE-DELETE.
 *
 * Cobre CA-D1..D6:
 *   D1 - logicallyDelete valido retorna ok(DeleteResult) status='LogicallyDeleted' + 3 campos
 *   D2 - reason vazio retorna err document-empty-delete-reason
 *   D3 - reason > 500 chars retorna err document-delete-reason-too-long
 *   D4 - at < uploadedAt retorna err document-delete-before-upload
 *   D5 - evento ContractDocumentDeleted com payload completo
 *   D6 - smoke type: logicallyDelete aceita apenas ActiveContractDocument
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Document from '#src/modules/contracts/domain/document/document.ts';
import type {
  ActiveContractDocument,
  LogicallyDeletedContractDocument,
} from '#src/modules/contracts/domain/document/types.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';

const VALID_UUID = '77777777-7777-4777-8777-777777777777';
const USER_UUID = '88888888-8888-4888-8888-888888888888';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const buildActive = (): ActiveContractDocument => {
  const r = Document.create({
    id: DocumentId.generate(),
    parentType: 'Contract',
    parentId: fromOk(ContractId.rehydrate(VALID_UUID), 'contractId'),
    categoria: 'signed_contract',
    fileName: 'doc.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    hashSha256: 'c'.repeat(64),
    bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
    storageKey: fromOk(createStorageKey('contracts/2026/doc.pdf'), 'key'),
    signedElectronically: true,
    version: 1,
    uploadedAt: new Date('2026-05-22T10:00:00.000Z'),
    uploadedBy: fromOk(UserRef.rehydrate(USER_UUID), 'userRef'),
    retentionUntil: null,
  });
  return fromOk(r, 'create').document as ActiveContractDocument;
};

const user = (): ReturnType<typeof UserRef.rehydrate> extends infer R
  ? R extends { ok: true; value: infer V }
    ? V
    : never
  : never => fromOk(UserRef.rehydrate(USER_UUID), 'userRef');

describe('Document.logicallyDelete', () => {
  it('CA-D1: input valido retorna ok com status=LogicallyDeleted + 3 campos audit', () => {
    const active = buildActive();
    const deletedAt = new Date('2026-06-01T10:00:00.000Z');
    const r = Document.logicallyDelete(active, 'documento substituido', user(), deletedAt);

    assert.equal(r.ok, true);
    if (r.ok) {
      const doc: LogicallyDeletedContractDocument = r.value.document;
      assert.equal(doc.status, 'LogicallyDeleted');
      assert.equal(doc.deletedAt.toISOString(), deletedAt.toISOString());
      assert.equal(doc.deletedBy, user());
      assert.equal(doc.deletedReason, 'documento substituido');
      // Campos do core preservados
      assert.equal(doc.id, active.id);
      assert.equal(doc.fileName, active.fileName);
    }
  });

  it('CA-D2: reason vazio retorna err document-empty-delete-reason', () => {
    const active = buildActive();
    const r = Document.logicallyDelete(active, '', user(), new Date('2026-06-01'));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-empty-delete-reason');
  });

  it('CA-D3: reason > 500 chars retorna err document-delete-reason-too-long', () => {
    const active = buildActive();
    const longReason = 'x'.repeat(501);
    const r = Document.logicallyDelete(active, longReason, user(), new Date('2026-06-01'));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-delete-reason-too-long');
  });

  it('CA-D4: at < uploadedAt retorna err document-delete-before-upload', () => {
    const active = buildActive();
    const tooEarly = new Date('2026-05-21T10:00:00.000Z'); // pre upload (2026-05-22)
    const r = Document.logicallyDelete(active, 'motivo', user(), tooEarly);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-delete-before-upload');
  });

  it('CA-D5: emite evento ContractDocumentDeleted com payload completo', () => {
    const active = buildActive();
    const at = new Date('2026-06-01T12:00:00.000Z');
    const r = Document.logicallyDelete(active, 'motivo de teste', user(), at);
    assert.equal(r.ok, true);
    if (r.ok) {
      const ev = r.value.event;
      assert.equal(ev.type, 'ContractDocumentDeleted');
      assert.equal(ev.documentId, active.id);
      assert.equal(ev.parentType, 'Contract');
      assert.equal(ev.parentId, active.parentId);
      assert.equal(ev.deletedBy, user());
      assert.equal(ev.deletedReason, 'motivo de teste');
      assert.equal(ev.occurredAt.toISOString(), at.toISOString());
    }
  });

  it('CA-D6: smoke type - logicallyDelete aceita ActiveContractDocument', () => {
    const active = buildActive();
    // Esta linha so compila se a signature aceitar ActiveContractDocument.
    // Em runtime, valida que retorna sem throw.
    const r = Document.logicallyDelete(active, 'ok', user(), new Date('2026-06-01'));
    assert.equal(typeof r, 'object');
    assert.equal(r.ok, true);
  });
});
