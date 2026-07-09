import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Result } from '#src/shared/primitives/result.ts';
// W0 RED: o VO SourceFileRef ainda não existe (value import → ERR_MODULE_NOT_FOUND).
import * as SourceFileRef from '#src/modules/financial/domain/document/source-file-ref.ts';
import * as DocumentId from '#src/modules/financial/domain/shared/document-id.ts';
import { saveDraft } from '#src/modules/financial/domain/document/document.ts';
import {
  mapDocumentToRow,
  mapRowToDocument,
} from '#src/modules/financial/adapters/persistence/mappers/document.mapper.ts';

const must = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) throw new Error(`esperava ok, veio err: ${JSON.stringify(r.error)}`);
  return r.value;
};

// A row de INSERT (NewDocumentRow) casa com o SELECT após persistida — o repo real faz insert→select.
type DocRow = Parameters<typeof mapRowToDocument>[0]['documentRow'];
const asDocRow = (r: Record<string, unknown>): DocRow => r as unknown as DocRow;

const VALID = {
  bucket: 'financial-documents',
  key: 'financial/2f1a/nota.pdf',
  hashSha256: 'a'.repeat(64),
  sizeBytes: 84500,
  mimeType: 'application/pdf',
} as const;

describe('financial/domain/document/source-file-ref', () => {
  it('CA1: create com input válido → ok', () => {
    const r = SourceFileRef.create(VALID);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.bucket, VALID.bucket);
    assert.equal(r.value.key, VALID.key);
    assert.equal(r.value.hashSha256, VALID.hashSha256);
    assert.equal(r.value.sizeBytes, VALID.sizeBytes);
    assert.equal(r.value.mimeType, VALID.mimeType);
  });

  it('CA1: rejeita hash sha256 malformado', () => {
    const r = SourceFileRef.create({ ...VALID, hashSha256: 'not-a-hash' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-file-hash-invalid');
  });

  it('CA1: rejeita sizeBytes não-positivo', () => {
    const r = SourceFileRef.create({ ...VALID, sizeBytes: 0 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-file-size-invalid');
  });

  it('CA1: rejeita key com path-traversal', () => {
    const r = SourceFileRef.create({ ...VALID, key: '../../etc/passwd' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-file-key-invalid');
  });

  it('CA1: rejeita bucket vazio', () => {
    const r = SourceFileRef.create({ ...VALID, bucket: '' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-file-bucket-invalid');
  });

  it('CA1: rejeita campos acima da largura das colunas (bucket>63 / key>1024 / mime>127)', () => {
    const b = SourceFileRef.create({ ...VALID, bucket: 'b'.repeat(64) });
    assert.equal(b.ok, false);
    if (!b.ok) assert.equal(b.error, 'source-file-bucket-invalid');
    const k = SourceFileRef.create({ ...VALID, key: `k${'x'.repeat(1024)}` });
    assert.equal(k.ok, false);
    if (!k.ok) assert.equal(k.error, 'source-file-key-invalid');
    const m = SourceFileRef.create({ ...VALID, mimeType: 'm'.repeat(128) });
    assert.equal(m.ok, false);
    if (!m.ok) assert.equal(m.error, 'source-file-mime-invalid');
  });

  it('CA2: saveDraft com sourceFileRef → o rascunho carrega a ref', () => {
    const ref = must(SourceFileRef.create(VALID));
    const out = must(saveDraft({ id: DocumentId.generate(), sourceFileRef: ref }));
    assert.deepEqual(out.document.sourceFileRef, ref);
  });

  it('CA2: saveDraft sem sourceFileRef → null (back-compat)', () => {
    const out = must(saveDraft({ id: DocumentId.generate() }));
    assert.equal(out.document.sourceFileRef, null);
  });

  it('CA3: mapper round-trip (domínio → row → domínio) preserva sourceFileRef', () => {
    const ref = must(SourceFileRef.create(VALID));
    const draft = must(saveDraft({ id: DocumentId.generate(), sourceFileRef: ref })).document;
    const row = asDocRow(mapDocumentToRow(draft, 0));
    const back = must(
      mapRowToDocument({ documentRow: row, retentionRows: [], registeredTaxRows: [] }),
    );
    assert.equal(back.status, 'Draft');
    if (back.status === 'Draft') assert.deepEqual(back.sourceFileRef, ref);
  });

  it('CA3: row com hash de comprovante inválido → err(mapper-invalid-source-file)', () => {
    const draft = must(
      saveDraft({ id: DocumentId.generate(), sourceFileRef: must(SourceFileRef.create(VALID)) }),
    ).document;
    const row = asDocRow({ ...mapDocumentToRow(draft, 0), sourceFileHashSha256: 'nao-e-hash' });
    const back = mapRowToDocument({ documentRow: row, retentionRows: [], registeredTaxRows: [] });
    assert.equal(back.ok, false);
    if (!back.ok) assert.equal(back.error, 'mapper-invalid-source-file');
  });

  it('CA3: corrupção parcial (bucket NULL + irmã preenchida) → err, não perda silenciosa', () => {
    const draft = must(saveDraft({ id: DocumentId.generate() })).document; // sem comprovante
    const row = asDocRow({
      ...mapDocumentToRow(draft, 0),
      sourceFileBucket: null,
      sourceFileKey: 'orfao.pdf',
    });
    const back = mapRowToDocument({ documentRow: row, retentionRows: [], registeredTaxRows: [] });
    assert.equal(back.ok, false);
    if (!back.ok) assert.equal(back.error, 'mapper-invalid-source-file');
  });
});
