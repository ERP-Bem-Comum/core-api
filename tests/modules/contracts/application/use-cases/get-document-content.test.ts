/**
 * CTR-HTTP-DOCUMENT-CONTENT — W0/W1 — use case `getDocumentContent`.
 *
 * Sequência: validar contractId/documentId → carregar metadados (documentRepo) →
 * ownership (parentType Contract direto, ou Amendment via amendmentRepo) → ler bytes
 * (storage.getContent) → ok({ bytes, fileName, contentType }).
 *
 * Erros: 'contract-id-invalid', 'document-id-invalid', 'document-not-found',
 * 'document-not-owned', erros de storage propagados.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { getDocumentContent } from '#src/modules/contracts/application/use-cases/get-document-content.ts';
import { createInMemoryDocumentStorage } from '#src/modules/contracts/adapters/storage/document-storage.in-memory.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';

import * as Document from '#src/modules/contracts/domain/document/document.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type { ContractDocument } from '#src/modules/contracts/domain/document/types.ts';

const CONTRACT_A = '11111111-1111-4111-8111-111111111111';
const CONTRACT_B = '22222222-2222-4222-8222-222222222222';
const AMEND_A = '33333333-3333-4333-8333-333333333333';
const DOC_CONTRACT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const DOC_AMENDMENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const USER_UUID = '44444444-4444-4444-8444-444444444444';

const PDF_BYTES = new Uint8Array(Buffer.from('%PDF-1.4 fixture'));

const fromOk = <T, E>(r: Result<T, E>, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const BUCKET = 'contracts-documents';

const buildDoc = (
  id: string,
  parentType: 'Contract' | 'Amendment',
  parentId: string,
  storageKey: string,
): ContractDocument =>
  fromOk(
    Document.create({
      id: fromOk(DocumentId.rehydrate(id), 'docId'),
      parentType,
      parentId:
        parentType === 'Contract'
          ? fromOk(ContractId.rehydrate(parentId), 'contractParent')
          : fromOk(AmendmentId.rehydrate(parentId), 'amendmentParent'),
      categoria: 'signed_contract',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: PDF_BYTES.length,
      hashSha256: 'a'.repeat(64),
      bucket: fromOk(createBucketName(BUCKET), 'bucket'),
      storageKey: fromOk(createStorageKey(storageKey), 'key'),
      signedElectronically: true,
      version: 1,
      uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
      uploadedBy: fromOk(UserRef.rehydrate(USER_UUID), 'userRef'),
      retentionUntil: null,
    }),
    'document',
  ).document;

/**
 * Mundo de teste: storage com bytes carregados + repos com metadados. Documento de
 * contrato (DOC_CONTRACT no contrato A) e de aditivo (DOC_AMENDMENT no aditivo A do
 * contrato A) já com bytes no storage.
 */
const setupWorld = async () => {
  const storage = createInMemoryDocumentStorage();
  const { repo: documentRepo } = InMemoryDocumentRepository();
  const { repo: amendmentRepo } = InMemoryAmendmentRepository();

  const bucket = fromOk(createBucketName(BUCKET), 'bucket');
  const contractKey = fromOk(createStorageKey(`contracts/${DOC_CONTRACT}/doc.pdf`), 'key');
  const amendmentKey = fromOk(createStorageKey(`contracts/${DOC_AMENDMENT}/doc.pdf`), 'key');

  await storage.upload({ bucket, key: contractKey, bytes: PDF_BYTES, mimeType: 'application/pdf' });
  await storage.upload({
    bucket,
    key: amendmentKey,
    bytes: PDF_BYTES,
    mimeType: 'application/pdf',
  });

  const contractDoc = buildDoc(DOC_CONTRACT, 'Contract', CONTRACT_A, String(contractKey));
  const amendmentDoc = buildDoc(DOC_AMENDMENT, 'Amendment', AMEND_A, String(amendmentKey));
  fromOk(await documentRepo.save(contractDoc, []), 'save contractDoc');
  fromOk(await documentRepo.save(amendmentDoc, []), 'save amendmentDoc');

  // Aditivo A pertence ao contrato A.
  const amendment = fromOk(
    Amendment.create({
      id: fromOk(AmendmentId.rehydrate(AMEND_A), 'amendId'),
      contractId: fromOk(ContractId.rehydrate(CONTRACT_A), 'amendContract'),
      amendmentNumber: 'AD 01-001/2026',
      description: 'fixture',
      kind: 'Misc',
      createdAt: new Date('2026-03-01'),
    }),
    'amendment.create',
  ).amendment;
  fromOk(await amendmentRepo.save(amendment, []), 'save amendment');

  return { deps: { documentRepo, amendmentRepo, storage } };
};

// ─── sucesso ─────────────────────────────────────────────────────────────────

describe('getDocumentContent — sucesso', () => {
  it('documento de contrato: retorna bytes + fileName + contentType', async () => {
    const { deps } = await setupWorld();
    const r = await getDocumentContent(deps)({
      contractId: CONTRACT_A,
      documentId: DOC_CONTRACT,
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.value.bytes, Buffer.from(PDF_BYTES));
      assert.equal(r.value.fileName, 'doc.pdf');
      assert.equal(r.value.contentType, 'application/pdf');
    }
  });

  it('documento de aditivo do contrato: retorna bytes (ownership via aditivo)', async () => {
    const { deps } = await setupWorld();
    const r = await getDocumentContent(deps)({
      contractId: CONTRACT_A,
      documentId: DOC_AMENDMENT,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.bytes, Buffer.from(PDF_BYTES));
  });
});

// ─── ownership ───────────────────────────────────────────────────────────────

describe('getDocumentContent — ownership (document-not-owned)', () => {
  it('documento de contrato acessado via outro contrato -> document-not-owned', async () => {
    const { deps } = await setupWorld();
    const r = await getDocumentContent(deps)({
      contractId: CONTRACT_B,
      documentId: DOC_CONTRACT,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-not-owned');
  });

  it('documento de aditivo acessado via outro contrato -> document-not-owned', async () => {
    const { deps } = await setupWorld();
    const r = await getDocumentContent(deps)({
      contractId: CONTRACT_B,
      documentId: DOC_AMENDMENT,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-not-owned');
  });
});

// ─── erros de validação / not-found ──────────────────────────────────────────

describe('getDocumentContent — validação e not-found', () => {
  it('contractId inválido -> contract-id-invalid', async () => {
    const { deps } = await setupWorld();
    const r = await getDocumentContent(deps)({ contractId: 'nao-uuid', documentId: DOC_CONTRACT });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });

  it('documentId inválido -> document-id-invalid', async () => {
    const { deps } = await setupWorld();
    const r = await getDocumentContent(deps)({ contractId: CONTRACT_A, documentId: 'nao-uuid' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-id-invalid');
  });

  it('documento inexistente -> document-not-found', async () => {
    const { deps } = await setupWorld();
    const r = await getDocumentContent(deps)({
      contractId: CONTRACT_A,
      documentId: '99999999-9999-4999-8999-999999999999',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-not-found');
  });
});
