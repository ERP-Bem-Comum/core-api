import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as SourceDocumentRef from '#src/modules/financial/domain/shared/source-document-ref.ts';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_V4 = 'cafebabe-1234-4abc-9def-fedcba987654';
const VALID_V4_UPPER = 'CAFEBABE-1234-4ABC-9DEF-FEDCBA987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('SourceDocumentRef — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as SourceDocumentRef`', () => {
    const ns: Readonly<Record<string, unknown>> = SourceDocumentRef;
    assert.equal(typeof ns.generate, 'function');
    assert.equal(typeof ns.rehydrate, 'function');
  });

  it('does NOT expose nested `SourceDocumentRef` namespace-object', () => {
    const ns: Readonly<Record<string, unknown>> = SourceDocumentRef;
    assert.equal(ns.SourceDocumentRef, undefined);
  });
});

describe('SourceDocumentRef — generate', () => {
  it('returns a v4 UUID string', () => {
    const id = SourceDocumentRef.generate();
    assert.match(id as unknown as string, UUID_V4_REGEX);
  });

  it('returns distinct values on consecutive calls', () => {
    const a = SourceDocumentRef.generate();
    const b = SourceDocumentRef.generate();
    assert.notEqual(a, b);
  });
});

describe('SourceDocumentRef — rehydrate', () => {
  it('accepts a valid v4 UUID', () => {
    const r = SourceDocumentRef.rehydrate(VALID_V4);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
  });

  it('accepts uppercase hex digits', () => {
    const r = SourceDocumentRef.rehydrate(VALID_V4_UPPER);
    assert.equal(isOk(r), true);
  });

  it('rejects empty string', () => {
    const r = SourceDocumentRef.rehydrate('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'source-document-ref-invalid');
  });

  it('rejects non-UUID string', () => {
    const r = SourceDocumentRef.rehydrate('not-a-uuid');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'source-document-ref-invalid');
  });

  it('rejects UUID v1', () => {
    const r = SourceDocumentRef.rehydrate(V1_UUID);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'source-document-ref-invalid');
  });
});
