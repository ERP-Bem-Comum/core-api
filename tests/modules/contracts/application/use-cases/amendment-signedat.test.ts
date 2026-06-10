/**
 * CTR-AMENDMENT-SIGNEDAT-AND-NUMBER — W0 (RED) — G2: `signedAt` por aditivo.
 *
 * DEVE FALHAR: hoje `Amendment.attachSignedDocument` não recebe `signedAt` e o agregado não o expõe.
 * GREEN no W1, quando o attach captura `signedAt` (data de negócio) → presente em
 * PendingWithDocument + Homologated; ausente em PendingWithoutDocument.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';

import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { createAmendment } from '#src/modules/contracts/application/use-cases/create-amendment.ts';
import { attachSignedDocument } from '#src/modules/contracts/application/use-cases/attach-signed-document.ts';
import * as Document from '#src/modules/contracts/domain/document/document.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import { buildContract } from '../../adapters/persistence/fixtures.ts';

const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, l: string): T => {
  if (!r.ok) throw new Error(`${l}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';
const USER = '66666666-6666-4666-8666-666666666666';
const SIGNED_AT = '2026-02-15';

// ─── Domínio ────────────────────────────────────────────────────────────────

describe('Amendment.attachSignedDocument — captura signedAt (G2)', () => {
  const pending = () =>
    unwrap(
      Amendment.create({
        id: AmendmentId.generate(),
        contractId: unwrap(ContractId.rehydrate(CONTRACT_ID), 'cid'),
        amendmentNumber: '01/2026',
        description: 'Ajuste',
        createdAt: new Date('2026-02-01'),
        kind: 'Misc',
      }),
      'create',
    ).amendment;

  it('PendingWithDocument carrega signedAt após o attach', () => {
    const docRef = DocumentId.generate();
    const signedAt = new Date(SIGNED_AT);
    const r = Amendment.attachSignedDocument(pending(), docRef, signedAt);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.signedDocumentRef, docRef);
    assert.equal(r.value.amendment.signedAt.getTime(), signedAt.getTime());
  });

  it('homologate preserva o signedAt', () => {
    const docRef = DocumentId.generate();
    const signedAt = new Date(SIGNED_AT);
    const attached = unwrap(
      Amendment.attachSignedDocument(pending(), docRef, signedAt),
      'attach',
    ).amendment;
    const by = unwrap(UserRef.rehydrate(USER), 'user');
    const r = Amendment.homologate(attached, by, new Date('2026-03-01'));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.signedAt.getTime(), signedAt.getTime());
  });
});

// ─── Use case ───────────────────────────────────────────────────────────────

const signedAmendmentDoc = (amendmentId: string) =>
  unwrap(
    Document.create({
      id: DocumentId.generate(),
      parentType: 'Amendment',
      parentId: unwrap(AmendmentId.rehydrate(amendmentId), 'aid'),
      categoria: 'signed_amendment',
      fileName: 'signed.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5,
      hashSha256: 'a'.repeat(64),
      bucket: unwrap(createBucketName('contracts-documents'), 'bucket'),
      storageKey: unwrap(createStorageKey('contracts/2026/signed.pdf'), 'key'),
      signedElectronically: true,
      version: 1,
      uploadedAt: new Date('2026-02-15T00:00:00.000Z'),
      uploadedBy: unwrap(UserRef.rehydrate(USER), 'user'),
      retentionUntil: null,
    }),
    'doc',
  ).document;

describe('attachSignedDocument (use case) — persiste signedAt (G2)', () => {
  it('o aditivo persistido expõe o signedAt informado', async () => {
    const outbox = InMemoryOutbox();
    const contractRepo = InMemoryContractRepository(outbox.port);
    const amendmentRepo = InMemoryAmendmentRepository(outbox.port);
    const documentRepo = InMemoryDocumentRepository(outbox.port);
    const clock = ClockFixed(new Date('2026-02-01'));
    await contractRepo.repo.save(
      buildContract({ id: CONTRACT_ID, sequentialNumber: '001/2026' }),
      [],
    );
    const created = unwrap(
      await createAmendment({
        contractRepo: contractRepo.repo,
        amendmentRepo: amendmentRepo.repo,
        clock,
      })({ contractId: CONTRACT_ID, description: 'Ajuste', kind: 'Misc' }),
      'createAmendment',
    );
    const amendmentId = created.amendment.id as unknown as string;
    const doc = signedAmendmentDoc(amendmentId);
    await documentRepo.repo.save(doc, []);

    const r = await attachSignedDocument({
      amendmentRepo: amendmentRepo.repo,
      documentRepo: documentRepo.repo,
    })({
      amendmentId,
      signedDocumentRef: doc.id as unknown as string,
      signedAt: SIGNED_AT,
    });
    assert.equal(isOk(r), true);

    const persisted = await amendmentRepo.repo.findById(created.amendment.id);
    assert.equal(persisted.ok && persisted.value !== null, true);
    if (!persisted.ok || persisted.value === null) return;
    if (persisted.value.status === 'Pending' && persisted.value.signedDocumentRef !== null) {
      assert.equal(persisted.value.signedAt.getTime(), new Date(SIGNED_AT).getTime());
    } else {
      throw new Error(`esperado PendingWithDocument, got ${persisted.value.status}`);
    }
  });
});
