/**
 * W0 (RED) - Tests para Document.create() smart constructor.
 *
 * Ticket: CTR-DOCUMENT-AGGREGATE (domain-only).
 *
 * Cobre CA-T39..T48:
 *   T39 - input valido retorna ok(ContractDocument) status='Active'
 *   T40 - create retorna evento ContractDocumentAnexado com payload completo
 *   T41 - fileName vazio retorna err document-invalid-file-name
 *   T42 - fileName > 255 chars retorna err document-invalid-file-name
 *   T43 - mimeType vazio retorna err document-empty-mime-type
 *   T44 - sizeBytes < 0 retorna err document-negative-size
 *   T45 - hashSha256 invalido (nao matches /^[0-9a-f]{64}$/) retorna err document-invalid-hash-sha256
 *   T46 - version < 1 retorna err document-invalid-version
 *   T47 - retentionUntil < uploadedAt retorna err document-retention-before-upload
 *   T48 - retentionUntil null retorna ok (sem retencao)
 *
 * Estes tests DEVEM FALHAR em W0 - document.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Document from '#src/modules/contracts/domain/document/document.ts';
import type {
  ContractDocument,
  CreateContractDocumentInput,
} from '#src/modules/contracts/domain/document/types.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label} invalida: ${JSON.stringify(r.error)}`);
  return r.value;
};

const VALID_HASH = 'a'.repeat(64); // lowercase hex 64 chars
const VALID_UUID = '11111111-1111-4111-8111-111111111111'; // UUID v4

const baseInput = (): CreateContractDocumentInput => ({
  id: DocumentId.generate(),
  parentType: 'Contract',
  parentId: fromOk(ContractId.rehydrate(VALID_UUID), 'contractId'),
  categoria: 'signed_contract',
  fileName: 'contrato-001.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 12_345,
  hashSha256: VALID_HASH,
  bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
  storageKey: fromOk(createStorageKey('contracts/2026/contrato-001.pdf'), 'key'),
  signedElectronically: true,
  version: 1,
  uploadedAt: new Date('2026-05-22T10:00:00.000Z'),
  uploadedBy: fromOk(UserRef.rehydrate(VALID_UUID), 'userRef'),
  retentionUntil: null,
});

// -----------------------------------------------------------------------------
// suite
// -----------------------------------------------------------------------------

describe('Document.create', () => {
  it("CA-T39: input valido retorna ok(ContractDocument) status='Active'", () => {
    // Act
    const r = Document.create(baseInput());

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      const doc: ContractDocument = r.value.document;
      assert.equal(doc.status, 'Active');
      assert.equal(doc.fileName, 'contrato-001.pdf');
      assert.equal(doc.version, 1);
      assert.equal(doc.signedElectronically, true);
      assert.equal(doc.retentionUntil, null);
    }
  });

  it('CA-T40: create retorna evento ContractDocumentAnexado com campos completos (shape de domain)', () => {
    // Arrange
    const input = baseInput();

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      const event = r.value.event;
      // Shape de domain event: campos brandeds diretos + occurredAt (padrão ContractEvent/AmendmentEvent)
      assert.equal(event.type, 'ContractDocumentAttached');
      assert.equal(event.documentId, input.id);
      assert.equal(event.parentType, 'Contract');
      assert.equal(event.parentId, input.parentId);
      assert.equal(event.categoria, 'signed_contract');
      assert.equal(event.fileName, 'contrato-001.pdf');
      assert.equal(event.mimeType, 'application/pdf');
      assert.equal(event.sizeBytes, 12_345);
      assert.equal(event.hashSha256, VALID_HASH);
      assert.equal(event.bucket, input.bucket);
      assert.equal(event.storageKey, input.storageKey);
      assert.equal(event.signedElectronically, true);
      assert.equal(event.version, 1);
      assert.equal(event.uploadedBy, input.uploadedBy);
      assert.equal(event.retentionUntil, null);
      // occurredAt: igual a uploadedAt (decisão padrão)
      assert.equal(event.occurredAt.toISOString(), input.uploadedAt.toISOString());
    }
  });

  it('CA-T41: fileName vazio retorna err document-invalid-file-name', () => {
    // Arrange
    const input = { ...baseInput(), fileName: '' };

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-invalid-file-name');
  });

  it('CA-T42: fileName > 255 chars retorna err document-invalid-file-name', () => {
    // Arrange
    const input = { ...baseInput(), fileName: 'a'.repeat(256) };

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-invalid-file-name');
  });

  it('CA-T43: mimeType vazio retorna err document-empty-mime-type', () => {
    // Arrange
    const input = { ...baseInput(), mimeType: '' };

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-empty-mime-type');
  });

  it('CA-T44: sizeBytes < 0 retorna err document-negative-size', () => {
    // Arrange
    const input = { ...baseInput(), sizeBytes: -1 };

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-negative-size');
  });

  it('CA-T45: hashSha256 invalido retorna err document-invalid-hash-sha256', () => {
    // Arrange — UPPERCASE viola regex /^[0-9a-f]{64}$/
    const input = { ...baseInput(), hashSha256: 'A'.repeat(64) };

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-invalid-hash-sha256');
  });

  it('CA-T46: version < 1 retorna err document-invalid-version', () => {
    // Arrange
    const input = { ...baseInput(), version: 0 };

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-invalid-version');
  });

  it('CA-T47: retentionUntil < uploadedAt retorna err document-retention-before-upload', () => {
    // Arrange
    const input = {
      ...baseInput(),
      uploadedAt: new Date('2026-05-22T10:00:00.000Z'),
      retentionUntil: new Date('2026-05-20T10:00:00.000Z'),
    };

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-retention-before-upload');
  });

  it('CA-T48: retentionUntil null retorna ok (sem retencao)', () => {
    // Arrange
    const input = { ...baseInput(), retentionUntil: null };

    // Act
    const r = Document.create(input);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.document.retentionUntil, null);
  });
});
