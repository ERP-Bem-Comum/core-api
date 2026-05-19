import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { StorageKey } from '#src/modules/contracts/domain/shared/storage-key.ts';

// Regras canônicas vêm da doc AWS S3:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
// A regra de tamanho (1024) é em BYTES UTF-8, não em code points — daí os testes
// específicos de multi-byte.

describe('StorageKey — happy path', () => {
  it('accepts a typical path-like key with date prefix', () => {
    const r = StorageKey.create('2026/05/aditivo-abc.pdf');
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, '2026/05/aditivo-abc.pdf');
  });

  it('accepts a 1-byte key', () => {
    const r = StorageKey.create('a');
    assert.equal(isOk(r), true);
  });

  it('accepts a key with exactly 1024 bytes (ASCII)', () => {
    const r = StorageKey.create('a'.repeat(1024));
    assert.equal(isOk(r), true);
  });

  it('accepts mixed-case ASCII (no lowercase requirement on keys)', () => {
    const r = StorageKey.create('Folder/Subfolder/File.PDF');
    assert.equal(isOk(r), true);
  });

  it('accepts keys with multi-byte UTF-8 chars under the byte limit', () => {
    const r = StorageKey.create('relatórios/2026/análise.pdf');
    assert.equal(isOk(r), true);
  });
});

describe('StorageKey — emptiness rule', () => {
  it('rejects empty string', () => {
    const r = StorageKey.create('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-empty');
  });
});

describe('StorageKey — byte-length rule (NOT code-point length)', () => {
  it('rejects ASCII keys longer than 1024 bytes', () => {
    const r = StorageKey.create('a'.repeat(1025));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-too-long');
  });

  it('rejects multi-byte keys whose byte length exceeds 1024 even if code points fit', () => {
    // 'ç' is 2 bytes in UTF-8 → 513 * 2 = 1026 bytes (above 1024) with 513 code points (well under).
    const key = 'ç'.repeat(513);
    const r = StorageKey.create(key);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-too-long');
  });

  it('accepts multi-byte keys whose byte length is exactly 1024', () => {
    // 'ç' = 2 bytes; 512 * 2 = 1024 bytes (boundary).
    const key = 'ç'.repeat(512);
    const r = StorageKey.create(key);
    assert.equal(isOk(r), true);
  });
});

describe('StorageKey — leading slash rule', () => {
  it('rejects keys starting with /', () => {
    const r = StorageKey.create('/leading');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-leading-slash');
  });

  it('rejects single-character / key', () => {
    const r = StorageKey.create('/');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-leading-slash');
  });
});

describe('StorageKey — double slash rule', () => {
  it('rejects keys containing //', () => {
    const r = StorageKey.create('a//b');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-double-slash');
  });

  it('rejects // appearing at end of key', () => {
    const r = StorageKey.create('folder//');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-double-slash');
  });
});

describe('StorageKey — path traversal rule', () => {
  it('rejects keys containing ..', () => {
    const r = StorageKey.create('../escape');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-path-traversal');
  });

  it('rejects keys containing ./', () => {
    const r = StorageKey.create('a/./b');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-path-traversal');
  });

  it('rejects keys containing .. in the middle', () => {
    const r = StorageKey.create('folder/../other');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-path-traversal');
  });
});

describe('StorageKey — control characters rule', () => {
  it('rejects keys containing \\x00 (NUL)', () => {
    const r = StorageKey.create(`file${String.fromCharCode(0x00)}name`);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-control-chars');
  });

  it('rejects keys containing \\x1F (US)', () => {
    const r = StorageKey.create(`file${String.fromCharCode(0x1f)}name`);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-control-chars');
  });

  it('rejects keys containing \\x7F (DEL)', () => {
    const r = StorageKey.create(`file${String.fromCharCode(0x7f)}name`);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-control-chars');
  });
});
