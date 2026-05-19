import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { BucketName } from '#src/modules/contracts/domain/shared/bucket-name.ts';
import { StorageKey } from '#src/modules/contracts/domain/shared/storage-key.ts';
import { StorageRef } from '#src/modules/contracts/domain/shared/storage-ref.ts';

// Helpers — assumem que BucketName/StorageKey já passam (testados em arquivos próprios).
const bucket = () => {
  const r = BucketName.create('contracts-documents');
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const key = () => {
  const r = StorageKey.create('2026/05/aditivo-abc.pdf');
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

// SHA-256 hex (64 chars lowercase) representando a string vazia.
const VALID_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('StorageRef — happy path', () => {
  it('accepts a fully valid descriptor', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.hashSha256, VALID_SHA256);
      assert.equal(r.value.sizeBytes, 1024);
      assert.equal(r.value.mimeType, 'application/pdf');
    }
  });

  it('accepts sizeBytes = 0 (empty file is valid)', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 0,
      mimeType: 'application/octet-stream',
    });
    assert.equal(isOk(r), true);
  });
});

describe('StorageRef — hash validation', () => {
  it('rejects hash with fewer than 64 hex chars', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256.slice(0, 63),
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });

  it('rejects hash with more than 64 hex chars', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256 + '0',
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });

  it('rejects hash with non-hex characters', () => {
    // Substitui o primeiro char por 'g' (não-hex).
    const bad = 'g' + VALID_SHA256.slice(1);
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: bad,
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });

  it("rejects uppercase hash (canonicalization is the producer's job)", () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256.toUpperCase(),
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });

  it('rejects empty hash', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: '',
      sizeBytes: 1,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-invalid-hash');
  });
});

describe('StorageRef — sizeBytes validation', () => {
  it('rejects negative sizeBytes', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: -1,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-negative-size');
  });

  it('rejects non-integer sizeBytes', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 1.5,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-non-integer-size');
  });

  it('rejects NaN sizeBytes', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: Number.NaN,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-non-integer-size');
  });

  it('rejects Infinity sizeBytes', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: Number.POSITIVE_INFINITY,
      mimeType: 'application/pdf',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-non-integer-size');
  });
});

describe('StorageRef — mimeType validation', () => {
  it('rejects empty mimeType', () => {
    const r = StorageRef.create({
      bucket: bucket(),
      key: key(),
      hashSha256: VALID_SHA256,
      sizeBytes: 1,
      mimeType: '',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-ref-empty-mime-type');
  });
});
