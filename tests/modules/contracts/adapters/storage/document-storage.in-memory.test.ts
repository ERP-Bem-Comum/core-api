/**
 * W0 (RED) - Tests para createInMemoryDocumentStorage.
 *
 * Ticket: CTR-STORAGE-INMEMORY.
 *
 * Cobre CA-T1..CA-T13:
 *   T1  - upload valido retorna ok(StorageRef) com bucket/key/mime/size/hashSha256
 *   T2  - upload + download retorna ok(Uint8Array) com mesmos bytes (copia)
 *   T3  - upload com expectedSha256 divergente retorna storage-integrity-mismatch
 *         e NAO armazena
 *   T4  - download de chave inexistente retorna storage-not-found
 *   T5  - exists retorna ok(true) apos upload, ok(false) para inexistente
 *   T6  - signedUrl(ref, 3600) retorna ok(URL) com host in-memory.local
 *   T7  - signedUrl(ref, 0) retorna err storage-invalid-ttl
 *   T8  - signedUrl(ref, 604801) retorna err storage-invalid-ttl
 *   T9  - bytes do caller mutados pos-upload NAO afetam blob armazenado
 *   T10 - bytes retornados por download mutados NAO afetam blob armazenado
 *   T11 - getAllBlobs retorna snapshot apos multiplos uploads
 *   T12 - clear zera size e getAllBlobs
 *   T13 - smoke type-level: InMemoryDocumentStorage e assignable a DocumentStorage
 *
 * Estes tests DEVEM FALHAR em W0 - in-memory.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';

import { createInMemoryDocumentStorage } from '#src/modules/contracts/adapters/storage/document-storage.in-memory.ts';
import type { DocumentStorage } from '#src/modules/contracts/application/ports/document-storage.ts';
import {
  createBucketName,
  createStorageKey,
  type BucketName,
  type StorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import type { Result } from '#src/shared/primitives/result.ts';

import { runDocumentStorageContract } from './document-storage.contract.ts';

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

const sha256hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const fromOk = <T, E>(r: Result<T, E>, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label} invalida: ${JSON.stringify(r.error)}`);
  return r.value;
};

const makeBucket = (): BucketName => fromOk(createBucketName('contracts-documents'), 'bucket');

const makeKey = (suffix = 'file.pdf'): StorageKey =>
  fromOk(createStorageKey(`contracts/abc-123/${suffix}`), 'key');

const helloBytes = (): Uint8Array => new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

const ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256_LOWER_HEX = /^[0-9a-f]{64}$/;

// -----------------------------------------------------------------------------
// Suite contratual paramétrica (cenários comuns CA-C1..C8)
// -----------------------------------------------------------------------------

runDocumentStorageContract('in-memory', async () => {
  await Promise.resolve();
  return {
    storage: createInMemoryDocumentStorage(),
    ctx: {
      bucket: makeBucket(),
      makeKey: (suffix: string) => makeKey(suffix),
    },
  };
});

// -----------------------------------------------------------------------------
// Cenários específicos do InMemory (CA-T1..T14) — não generalizáveis na suite
// -----------------------------------------------------------------------------

describe('createInMemoryDocumentStorage', () => {
  it('CA-T1: upload valido retorna ok(StorageRef) com campos esperados', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const bucket = makeBucket();
    const key = makeKey();
    const bytes = helloBytes();

    // Act
    const r = await storage.upload({
      bucket,
      key,
      bytes,
      mimeType: 'application/pdf',
    });

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.bucket, bucket);
      assert.equal(r.value.key, key);
      assert.equal(r.value.mimeType, 'application/pdf');
      assert.equal(r.value.sizeBytes, 5);
      assert.match(r.value.hashSha256, SHA256_LOWER_HEX);
      assert.equal(r.value.hashSha256, sha256hex(bytes));
    }
  });

  it('CA-T2: upload + download retorna ok(Uint8Array) com mesmos bytes', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const bytes = helloBytes();
    const up = await storage.upload({
      bucket: makeBucket(),
      key: makeKey(),
      bytes,
      mimeType: 'application/pdf',
    });
    if (!up.ok) throw new Error('upload deveria ok');

    // Act
    const r = await storage.download(up.value);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(Array.from(r.value), Array.from(bytes));
    }
  });

  it('CA-T3: upload com expectedSha256 divergente retorna storage-integrity-mismatch e NAO armazena', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const bucket = makeBucket();
    const key = makeKey();

    // Act
    const r = await storage.upload({
      bucket,
      key,
      bytes: helloBytes(),
      mimeType: 'application/pdf',
      expectedSha256: 'deadbeef'.repeat(8), // 64 chars hex, mas nao bate
    });

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'storage-integrity-mismatch');
    }
    assert.equal(storage.size(), 0, 'blob NAO deve ter sido armazenado em caso de mismatch');
  });

  it('CA-T4: download de chave inexistente retorna storage-not-found', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const phantomRef = {
      bucket: makeBucket(),
      key: makeKey('inexistente.pdf'),
      hashSha256: sha256hex(helloBytes()),
      sizeBytes: 5,
      mimeType: 'application/pdf',
    } as const;

    // Act
    const r = await storage.download(phantomRef);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'storage-not-found');
    }
  });

  it('CA-T5: exists retorna ok(true) apos upload, ok(false) para inexistente', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const bytes = helloBytes();
    const up = await storage.upload({
      bucket: makeBucket(),
      key: makeKey(),
      bytes,
      mimeType: 'application/pdf',
    });
    if (!up.ok) throw new Error('upload deveria ok');
    const phantomRef = {
      bucket: makeBucket(),
      key: makeKey('phantom.pdf'),
      hashSha256: sha256hex(bytes),
      sizeBytes: 5,
      mimeType: 'application/pdf',
    } as const;

    // Act
    const rExist = await storage.exists(up.value);
    const rPhantom = await storage.exists(phantomRef);

    // Assert
    assert.equal(rExist.ok, true);
    if (rExist.ok) assert.equal(rExist.value, true);
    assert.equal(rPhantom.ok, true);
    if (rPhantom.ok) assert.equal(rPhantom.value, false);
  });

  it('CA-T6: signedUrl(ref, 3600) retorna ok(URL) com host in-memory.local', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const up = await storage.upload({
      bucket: makeBucket(),
      key: makeKey(),
      bytes: helloBytes(),
      mimeType: 'application/pdf',
    });
    if (!up.ok) throw new Error('upload deveria ok');

    // Act
    const r = await storage.signedUrl(up.value, 3600);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.ok(r.value instanceof URL, 'signedUrl deve retornar instancia de URL');
      assert.equal(r.value.protocol, 'https:');
      assert.equal(r.value.hostname, 'in-memory.local');
      assert.equal(r.value.pathname, '/contracts-documents/contracts/abc-123/file.pdf');
      const expires = r.value.searchParams.get('expires');
      assert.ok(expires !== null, 'query param expires obrigatorio');
      assert.match(expires, ISO8601_REGEX, `expires deve ser ISO-8601; obtido: ${expires}`);
    }
  });

  it('CA-T7: signedUrl(ref, 0) retorna err storage-invalid-ttl', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const up = await storage.upload({
      bucket: makeBucket(),
      key: makeKey(),
      bytes: helloBytes(),
      mimeType: 'application/pdf',
    });
    if (!up.ok) throw new Error('upload deveria ok');

    // Act
    const r = await storage.signedUrl(up.value, 0);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'storage-invalid-ttl');
    }
  });

  it('CA-T8: signedUrl(ref, 604801) retorna err storage-invalid-ttl (>7 dias)', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const up = await storage.upload({
      bucket: makeBucket(),
      key: makeKey(),
      bytes: helloBytes(),
      mimeType: 'application/pdf',
    });
    if (!up.ok) throw new Error('upload deveria ok');

    // Act
    const r = await storage.signedUrl(up.value, 604801);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'storage-invalid-ttl');
    }
  });

  it('CA-T9: bytes do caller mutados pos-upload NAO afetam blob armazenado (defensive copy entrada)', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const bytes = new Uint8Array([1, 2, 3]);
    const up = await storage.upload({
      bucket: makeBucket(),
      key: makeKey(),
      bytes,
      mimeType: 'application/octet-stream',
    });
    if (!up.ok) throw new Error('upload deveria ok');

    // Act - muta o array original
    bytes[0] = 99;

    // Assert - download deve trazer os bytes originais
    const dl = await storage.download(up.value);
    assert.equal(dl.ok, true);
    if (dl.ok) {
      assert.deepEqual(Array.from(dl.value), [1, 2, 3]);
    }
  });

  it('CA-T10: bytes retornados por download mutados NAO afetam blob armazenado (defensive copy saida)', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const up = await storage.upload({
      bucket: makeBucket(),
      key: makeKey(),
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'application/octet-stream',
    });
    if (!up.ok) throw new Error('upload deveria ok');
    const first = await storage.download(up.value);
    if (!first.ok) throw new Error('download deveria ok');

    // Act - muta a copia retornada
    first.value[0] = 99;

    // Assert - segundo download deve trazer bytes originais
    const second = await storage.download(up.value);
    assert.equal(second.ok, true);
    if (second.ok) {
      assert.deepEqual(Array.from(second.value), [1, 2, 3]);
    }
  });

  it('CA-T14: getAllBlobs retorna snapshot com bytes clonados - mutacao NAO afeta blob armazenado (defensive copy profunda)', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const bucket = makeBucket();
    await storage.upload({
      bucket,
      key: makeKey('deep-clone.bin'),
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'application/octet-stream',
    });

    // Act - muta os bytes retornados pelo snapshot
    const snapshot = storage.getAllBlobs();
    const first = snapshot[0];
    if (first === undefined) throw new Error('snapshot[0] esperado');
    first.bytes[0] = 99;

    // Assert - segundo getAllBlobs deve trazer bytes originais
    const second = storage.getAllBlobs();
    const after = second[0];
    if (after === undefined) throw new Error('snapshot[0] esperado apos mutacao');
    assert.deepEqual(Array.from(after.bytes), [1, 2, 3]);
  });

  it('CA-T11: getAllBlobs retorna snapshot apos multiplos uploads', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    const bucket = makeBucket();
    await storage.upload({
      bucket,
      key: makeKey('a.pdf'),
      bytes: new Uint8Array([1]),
      mimeType: 'application/pdf',
    });
    await storage.upload({
      bucket,
      key: makeKey('b.pdf'),
      bytes: new Uint8Array([2, 2]),
      mimeType: 'application/pdf',
    });

    // Act
    const blobs = storage.getAllBlobs();

    // Assert
    assert.equal(blobs.length, 2);
    assert.equal(storage.size(), 2);
    const keys = blobs.map((b) => String(b.key)).sort();
    assert.deepEqual(keys, ['contracts/abc-123/a.pdf', 'contracts/abc-123/b.pdf']);
  });

  it('CA-T12: clear zera size e getAllBlobs', async () => {
    // Arrange
    const storage = createInMemoryDocumentStorage();
    await storage.upload({
      bucket: makeBucket(),
      key: makeKey('a.pdf'),
      bytes: helloBytes(),
      mimeType: 'application/pdf',
    });
    assert.equal(storage.size(), 1);

    // Act
    storage.clear();

    // Assert
    assert.equal(storage.size(), 0);
    assert.equal(storage.getAllBlobs().length, 0);
  });

  it('CA-T13: smoke type-level - InMemoryDocumentStorage e assignable a DocumentStorage', () => {
    // Arrange + Act
    const storage = createInMemoryDocumentStorage();
    const port: DocumentStorage = storage;

    // Assert
    assert.equal(typeof port.upload, 'function');
    assert.equal(typeof port.download, 'function');
    assert.equal(typeof port.exists, 'function');
    assert.equal(typeof port.signedUrl, 'function');
  });
});
