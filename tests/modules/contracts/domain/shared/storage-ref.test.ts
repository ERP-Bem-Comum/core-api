import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as BucketName from '#src/modules/contracts/application/ports/document-storage.types.ts';
import * as StorageKey from '#src/modules/contracts/application/ports/document-storage.types.ts';
import * as StorageRef from '#src/modules/contracts/application/ports/document-storage.types.ts';

// Helpers — assumem que BucketName/StorageKey já passam (testados em arquivos próprios).
const bucket = (): BucketName.BucketName => {
  const r = BucketName.createBucketName('contracts-documents');
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const key = (): StorageKey.StorageKey => {
  const r = StorageKey.createStorageKey('2026/05/aditivo-abc.pdf');
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

// SHA-256 hex (64 chars lowercase) representando a string vazia.
const VALID_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('StorageRef — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as StorageRef` (Padrão D smoke)', () => {
    // CTR-DOMAIN-RESTRUCTURE — BucketName/StorageKey/StorageRef consolidados em
    // application/ports/document-storage.types.ts. Smart constructors agora têm
    // prefixo do VO (createStorageRef, createStorageKey, createBucketName) para
    // evitar colisão de nome no module-as-namespace consolidado.
    const ns: Readonly<Record<string, unknown>> = StorageRef;
    assert.equal(typeof ns.createStorageRef, 'function');
  });

  it("does NOT expose a nested `StorageRef` namespace-object (DON'T B§7)", () => {
    const ns: Readonly<Record<string, unknown>> = StorageRef;
    assert.equal(ns.StorageRef, undefined);
  });
});

describe('StorageRef — happy path', () => {
  it('accepts a fully valid descriptor', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.hashSha256, VALID_SHA256);
      assert.equal(r.value.sizeBytes, 1024);
      assert.equal(r.value.mimeType, 'application/pdf');
    }
  });

  // DO B§10 — objeto retornado pelo smart constructor deve estar congelado
  it('returns a frozen StorageRef on success (Object.isFrozen === true)', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(Object.isFrozen(r.value), true);
  });

  it('accepts sizeBytes = 0 (empty file is valid)', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 0,
      mimeType: 'application/octet-stream',
    });
    // Assert
    assert.equal(isOk(r), true);
  });
});

describe('StorageRef — hash validation', () => {
  it('rejects hash with fewer than 64 hex chars', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256.slice(0, 63),
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });

  it('rejects hash with more than 64 hex chars', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256 + '0',
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });

  it('rejects hash with non-hex characters', () => {
    // Arrange — substitui o primeiro char por 'g' (não-hex)
    const bad = 'g' + VALID_SHA256.slice(1);
    // Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: bad,
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });

  it("rejects uppercase hash (canonicalization is the producer's job)", () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256.toUpperCase(),
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });

  it('rejects empty hash', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: '',
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });
});

describe('StorageRef — sizeBytes validation', () => {
  it('rejects negative sizeBytes', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: -1,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-negative-size');
  });

  it('rejects non-integer sizeBytes', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 1.5,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-non-integer-size');
  });

  it('rejects NaN sizeBytes', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: Number.NaN,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-non-integer-size');
  });

  it('rejects Infinity sizeBytes', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: Number.POSITIVE_INFINITY,
      mimeType: 'application/pdf',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-non-integer-size');
  });
});

describe('StorageRef — mimeType validation', () => {
  it('rejects empty mimeType', () => {
    // Arrange / Act
    const r = StorageRef.createStorageRef({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 1,
      mimeType: '',
    });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-empty-mime-type');
  });
});
