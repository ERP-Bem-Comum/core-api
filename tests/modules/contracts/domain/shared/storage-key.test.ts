import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { createStorageKey } from '#src/modules/contracts/application/ports/document-storage.types.ts';

// Regras canônicas vêm da doc AWS S3:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
// A regra de tamanho (1024) é em BYTES UTF-8, não em code points — daí os testes
// específicos de multi-byte.

describe('StorageKey — module-as-namespace (Padrão D)', () => {
  it('createStorageKey is exported as a function', () => {
    // Arrange / Act / Assert
    assert.equal(typeof createStorageKey, 'function');
  });
});

describe('StorageKey — happy path', () => {
  it('accepts a typical path-like key with date prefix', () => {
    // Arrange / Act
    const r = createStorageKey('2026/05/aditivo-abc.pdf');
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, '2026/05/aditivo-abc.pdf');
  });

  it('accepts a 1-byte key', () => {
    // Arrange / Act
    const r = createStorageKey('a');
    // Assert
    assert.equal(isOk(r), true);
  });

  it('accepts a key with exactly 1024 bytes (ASCII)', () => {
    // Arrange / Act
    const r = createStorageKey('a'.repeat(1024));
    // Assert
    assert.equal(isOk(r), true);
  });

  it('accepts mixed-case ASCII (no lowercase requirement on keys)', () => {
    // Arrange / Act
    const r = createStorageKey('Folder/Subfolder/File.PDF');
    // Assert
    assert.equal(isOk(r), true);
  });

  it('accepts keys with multi-byte UTF-8 chars under the byte limit', () => {
    // Arrange / Act
    const r = createStorageKey('relatórios/2026/análise.pdf');
    // Assert
    assert.equal(isOk(r), true);
  });
});

describe('StorageKey — emptiness rule', () => {
  it('rejects empty string', () => {
    // Arrange / Act
    const r = createStorageKey('');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-empty');
  });
});

describe('StorageKey — byte-length rule (NOT code-point length)', () => {
  it('rejects ASCII keys longer than 1024 bytes', () => {
    // Arrange / Act
    const r = createStorageKey('a'.repeat(1025));
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-too-long');
  });

  it('rejects multi-byte keys whose byte length exceeds 1024 even if code points fit', () => {
    // Arrange — 'ç' is 2 bytes in UTF-8 → 513 * 2 = 1026 bytes
    const key = 'ç'.repeat(513);
    // Act
    const r = createStorageKey(key);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-too-long');
  });

  it('accepts multi-byte keys whose byte length is exactly 1024', () => {
    // Arrange — 'ç' = 2 bytes; 512 * 2 = 1024 bytes (boundary)
    const key = 'ç'.repeat(512);
    // Act
    const r = createStorageKey(key);
    // Assert
    assert.equal(isOk(r), true);
  });
});

describe('StorageKey — leading slash rule', () => {
  it('rejects keys starting with /', () => {
    // Arrange / Act
    const r = createStorageKey('/leading');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-leading-slash');
  });

  it('rejects single-character / key', () => {
    // Arrange / Act
    const r = createStorageKey('/');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-leading-slash');
  });
});

describe('StorageKey — double slash rule', () => {
  it('rejects keys containing //', () => {
    // Arrange / Act
    const r = createStorageKey('a//b');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-double-slash');
  });

  it('rejects // appearing at end of key', () => {
    // Arrange / Act
    const r = createStorageKey('folder//');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-double-slash');
  });
});

describe('StorageKey — path traversal rule', () => {
  it('rejects keys containing ..', () => {
    // Arrange / Act
    const r = createStorageKey('../escape');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-path-traversal');
  });

  it('rejects keys containing ./', () => {
    // Arrange / Act
    const r = createStorageKey('a/./b');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-path-traversal');
  });

  it('rejects keys containing .. in the middle', () => {
    // Arrange / Act
    const r = createStorageKey('folder/../other');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-path-traversal');
  });
});

describe('StorageKey — control characters rule', () => {
  it('rejects keys containing \\x00 (NUL)', () => {
    // Arrange / Act
    const r = createStorageKey(`file${String.fromCharCode(0x00)}name`);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-control-chars');
  });

  it('rejects keys containing \\x1F (US)', () => {
    // Arrange / Act
    const r = createStorageKey(`file${String.fromCharCode(0x1f)}name`);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-control-chars');
  });

  it('rejects keys containing \\x7F (DEL)', () => {
    // Arrange / Act
    const r = createStorageKey(`file${String.fromCharCode(0x7f)}name`);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'storage-key-control-chars');
  });
});
