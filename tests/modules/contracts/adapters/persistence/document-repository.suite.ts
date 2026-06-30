/**
 * Suite contratual paramétrica de DocumentRepository.
 *
 * Function factory `(label, factory) => void` consumida em test files via
 * `runDocumentRepositoryContract('in-memory', { make: ... })`. Convenção `.contract.ts`
 * substituída por `.suite.ts` aqui para alinhamento com o padrão pré-existente
 * em `contract-repository.suite.ts`.
 *
 * Cobre cenários comuns CA-R1..R5:
 *   R1 - findById em repo vazio -> ok(null)
 *   R2 - findByParent em repo vazio -> ok([])
 *   R3 - save + findById -> round-trip (campo-a-campo)
 *   R4 - save + findByParent -> encontra documentos do mesmo parent
 *   R5 - save com events -> outbox observa
 *
 * Ticket: CTR-DOCUMENT-AGGREGATE-PERSISTENCE (W0).
 *
 * ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type { DocumentRepository } from '#src/modules/contracts/domain/document/repository.ts';
import type { ContractDocument } from '#src/modules/contracts/domain/document/types.ts';
import * as Document from '#src/modules/contracts/domain/document/document.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';

const VALID_HASH = 'b'.repeat(64);
const UUID_C = '22222222-2222-4222-8222-222222222222';
const UUID_U = '33333333-3333-4333-8333-333333333333';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label} invalida: ${JSON.stringify(r.error)}`);
  return r.value;
};

const buildDoc = (suffix: string, parentId?: string): ContractDocument => {
  const r = Document.create({
    id: DocumentId.generate(),
    parentType: 'Contract',
    parentId: fromOk(ContractId.rehydrate(parentId ?? UUID_C), 'contractId'),
    categoria: 'signed_contract',
    fileName: `doc-${suffix}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 100,
    hashSha256: VALID_HASH,
    bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
    storageKey: fromOk(createStorageKey(`contracts/2026/doc-${suffix}.pdf`), 'key'),
    signedElectronically: true,
    version: 1,
    uploadedAt: new Date('2026-05-22T10:00:00.000Z'),
    uploadedBy: fromOk(UserRef.rehydrate(UUID_U), 'userRef'),
    retentionUntil: null,
  });
  if (!r.ok) throw new Error(`buildDoc invalido: ${r.error}`);
  return r.value.document;
};

export type DocumentRepoFactoryResult = Readonly<{
  repo: DocumentRepository;
  /** Inspeção do outbox associado — quantos eventos foram appended. */
  outboxCount: () => Promise<number>;
  teardown?: () => Promise<void>;
}>;

export type DocumentRepoFactory = Readonly<{
  make: () => Promise<DocumentRepoFactoryResult>;
}>;

export const runDocumentRepositoryContract = (
  label: string,
  factory: DocumentRepoFactory,
): void => {
  describe(`DocumentRepository contract - ${label}`, () => {
    let env: DocumentRepoFactoryResult;

    beforeEach(async () => {
      env = await factory.make();
    });

    const cleanup = async (): Promise<void> => {
      if (env.teardown !== undefined) await env.teardown();
    };

    it('CA-R1: findById em repo vazio retorna ok(null)', async () => {
      try {
        const phantomId = DocumentId.generate();
        const r = await env.repo.findById(phantomId);
        assert.equal(r.ok, true);
        if (r.ok) assert.equal(r.value, null);
      } finally {
        await cleanup();
      }
    });

    it('CA-R2: findByParent em repo vazio retorna ok([])', async () => {
      try {
        const parentId = fromOk(ContractId.rehydrate(UUID_C), 'cid');
        const r = await env.repo.findByParent('Contract', parentId);
        assert.equal(r.ok, true);
        if (r.ok) assert.deepEqual(r.value, []);
      } finally {
        await cleanup();
      }
    });

    it('CA-R3: save + findById faz round-trip campo-a-campo', async () => {
      try {
        const doc = buildDoc('r3');
        const save = await env.repo.save(doc, []);
        assert.equal(save.ok, true, `save deveria ok: ${JSON.stringify(save)}`);

        const found = await env.repo.findById(doc.id);
        assert.equal(found.ok, true);
        if (found.ok && found.value !== null) {
          assert.equal(found.value.id, doc.id);
          assert.equal(found.value.fileName, doc.fileName);
          assert.equal(found.value.mimeType, doc.mimeType);
          assert.equal(found.value.sizeBytes, doc.sizeBytes);
          assert.equal(found.value.hashSha256, doc.hashSha256);
          assert.equal(found.value.bucket, doc.bucket);
          assert.equal(found.value.storageKey, doc.storageKey);
          assert.equal(found.value.signedElectronically, doc.signedElectronically);
          assert.equal(found.value.version, doc.version);
          assert.equal(found.value.uploadedAt.toISOString(), doc.uploadedAt.toISOString());
          assert.equal(found.value.uploadedBy, doc.uploadedBy);
          assert.equal(found.value.retentionUntil, doc.retentionUntil);
          assert.equal(found.value.categoria, doc.categoria);
          assert.equal(found.value.status, 'Active');
        } else {
          assert.fail('documento nao encontrado apos save');
        }
      } finally {
        await cleanup();
      }
    });

    it('CA-R4: findByParent retorna documentos do mesmo parent', async () => {
      try {
        const docA = buildDoc('r4-a');
        const docB = buildDoc('r4-b');
        await env.repo.save(docA, []);
        await env.repo.save(docB, []);

        const r = await env.repo.findByParent('Contract', docA.parentId);
        assert.equal(r.ok, true);
        if (r.ok) {
          assert.equal(r.value.length, 2, `esperado 2 docs; obtido ${r.value.length}`);
          const ids = r.value.map((d) => String(d.id)).sort();
          const expected = [String(docA.id), String(docB.id)].sort();
          assert.deepEqual(ids, expected);
        }
      } finally {
        await cleanup();
      }
    });

    it('CA-R5: save com events appendados no outbox (count incrementa)', async () => {
      try {
        const before = await env.outboxCount();
        const doc = buildDoc('r5');
        const r = Document.create({
          id: doc.id,
          parentType: doc.parentType,
          parentId: doc.parentId,
          categoria: doc.categoria,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          hashSha256: doc.hashSha256,
          bucket: doc.bucket,
          storageKey: doc.storageKey,
          signedElectronically: doc.signedElectronically,
          version: doc.version,
          uploadedAt: doc.uploadedAt,
          uploadedBy: doc.uploadedBy,
          retentionUntil: doc.retentionUntil,
        });
        if (!r.ok) throw new Error('build doc r5 invalido');
        const save = await env.repo.save(r.value.document, [r.value.event]);
        assert.equal(save.ok, true);

        const after = await env.outboxCount();
        assert.equal(after, before + 1, 'outbox deve ter incrementado em 1');
      } finally {
        await cleanup();
      }
    });
  });
};
