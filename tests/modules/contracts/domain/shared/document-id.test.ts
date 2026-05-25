import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';
const VALID_V4_UPPER = '7F3A1234-5678-4ABC-9DEF-FEDCBA987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('DocumentId — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as DocumentId` (Padrão D smoke)', () => {
    // Arrange
    const ns: Readonly<Record<string, unknown>> = DocumentId;
    // Act / Assert
    assert.equal(typeof ns.generate, 'function');
    assert.equal(typeof ns.rehydrate, 'function');
  });

  it("does NOT expose a nested `DocumentId` namespace-object (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = DocumentId;
    // Assert
    assert.equal(ns.DocumentId, undefined);
  });
});

describe('DocumentId — generate', () => {
  it('returns a v4 UUID string', () => {
    // Arrange / Act
    const id = DocumentId.generate();
    // Assert
    assert.match(id as unknown as string, UUID_V4_REGEX);
  });

  it('returns distinct values on consecutive calls', () => {
    // Arrange / Act
    const a = DocumentId.generate();
    const b = DocumentId.generate();
    // Assert
    assert.notEqual(a, b);
  });
});

describe('DocumentId — rehydrate', () => {
  it('accepts a valid v4 UUID', () => {
    // Arrange / Act
    const r = DocumentId.rehydrate(VALID_V4);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
  });

  it('accepts uppercase hex digits (case-insensitive)', () => {
    // Arrange / Act
    const r = DocumentId.rehydrate(VALID_V4_UPPER);
    // Assert
    assert.equal(isOk(r), true);
  });

  it('rejects empty string', () => {
    // Arrange / Act
    const r = DocumentId.rehydrate('');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-id-invalid');
  });

  it('rejects non-UUID string', () => {
    // Arrange / Act
    const r = DocumentId.rehydrate('not-a-uuid');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-id-invalid');
  });

  it('rejects UUID v1 (wrong version)', () => {
    // Arrange / Act
    const r = DocumentId.rehydrate(V1_UUID);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-id-invalid');
  });

  it('rejects UUID with trailing whitespace', () => {
    // Arrange / Act
    const r = DocumentId.rehydrate(`${VALID_V4} `);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-id-invalid');
  });
});
