/**
 * W0 (RED) - Tests para Document.supersede.
 *
 * Ticket: CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE.
 *
 * Cobre CA-S1..S6:
 *   S1 - supersede valido retorna ok(SupersedeResult) com refined Superseded + 3 campos
 *   S2 - supersededByDocumentId === active.id retorna err document-supersede-self
 *   S3 - at < uploadedAt retorna err document-supersede-before-upload
 *   S4 - evento ContractDocumentSuperseded com payload completo
 *   S5 - smoke type: supersede aceita apenas ActiveContractDocument
 *   S6 - Superseded discriminado de LogicallyDeleted (compile + runtime)
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Document from '#src/modules/contracts/domain/document/document.ts';
import type {
  ActiveContractDocument,
  SupersededContractDocument,
} from '#src/modules/contracts/domain/document/types.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';

const VALID_UUID = '99999999-9999-4999-8999-999999999999';
const USER_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
    fileName: 'doc-v1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    hashSha256: 'd'.repeat(64),
    bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
    storageKey: fromOk(createStorageKey('contracts/2026/doc-v1.pdf'), 'key'),
    signedElectronically: true,
    version: 1,
    uploadedAt: new Date('2026-05-22T10:00:00.000Z'),
    uploadedBy: fromOk(UserRef.rehydrate(USER_UUID), 'userRef'),
    retentionUntil: null,
  });
  return fromOk(r, 'create').document;
};

const user = (): ReturnType<typeof UserRef.rehydrate> extends infer R
  ? R extends { ok: true; value: infer V }
    ? V
    : never
  : never => fromOk(UserRef.rehydrate(USER_UUID), 'userRef');

describe('Document.supersede', () => {
  it('CA-S1: input valido retorna ok com status=Superseded + 3 campos audit', () => {
    const active = buildActive();
    const newDocId = DocumentId.generate();
    const at = new Date('2026-06-15T10:00:00.000Z');

    const r = Document.supersede(active, newDocId, user(), at);

    assert.equal(r.ok, true);
    if (r.ok) {
      const doc: SupersededContractDocument = r.value.document;
      assert.equal(doc.status, 'Superseded');
      assert.equal(doc.supersededAt.toISOString(), at.toISOString());
      assert.equal(doc.supersededBy, user());
      assert.equal(doc.supersededByDocumentId, newDocId);
      // Core preservado
      assert.equal(doc.id, active.id);
      assert.equal(doc.fileName, active.fileName);
    }
  });

  it('CA-S2: supersededByDocumentId === active.id retorna err document-supersede-self', () => {
    const active = buildActive();
    const r = Document.supersede(active, active.id, user(), new Date('2026-06-15'));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-supersede-self');
  });

  it('CA-S3: at < uploadedAt retorna err document-supersede-before-upload', () => {
    const active = buildActive();
    const tooEarly = new Date('2026-05-21T00:00:00.000Z'); // < uploadedAt
    const r = Document.supersede(active, DocumentId.generate(), user(), tooEarly);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-supersede-before-upload');
  });

  it('CA-S4: emite evento ContractDocumentSuperseded com payload completo', () => {
    const active = buildActive();
    const newDocId = DocumentId.generate();
    const at = new Date('2026-06-15T12:00:00.000Z');
    const r = Document.supersede(active, newDocId, user(), at);
    assert.equal(r.ok, true);
    if (r.ok) {
      const ev = r.value.event;
      assert.equal(ev.type, 'ContractDocumentSuperseded');
      assert.equal(ev.documentId, active.id);
      assert.equal(ev.parentType, 'Contract');
      assert.equal(ev.parentId, active.parentId);
      assert.equal(ev.supersededBy, user());
      assert.equal(ev.supersededByDocumentId, newDocId);
      assert.equal(ev.occurredAt.toISOString(), at.toISOString());
    }
  });

  it('CA-S5: smoke type - supersede aceita ActiveContractDocument', () => {
    const active = buildActive();
    const r = Document.supersede(active, DocumentId.generate(), user(), new Date('2026-06-15'));
    assert.equal(typeof r, 'object');
    assert.equal(r.ok, true);
  });

  it('CA-S6: Superseded discriminado de LogicallyDeleted via switch exaustivo', () => {
    const active = buildActive();
    const r = Document.supersede(active, DocumentId.generate(), user(), new Date('2026-06-15'));
    assert.equal(r.ok, true);
    if (r.ok) {
      // Switch exaustivo: TS narrow para variante correta.
      const doc = r.value.document;
      switch (doc.status) {
        case 'Superseded':
          // Acesso a campos exclusivos da variante
          assert.ok(doc.supersededByDocumentId !== undefined);
          break;
        // Outras variantes (Active/LogicallyDeleted) nao deveriam aparecer aqui.
      }
    }
  });
});
