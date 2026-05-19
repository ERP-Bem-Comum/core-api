/**
 * Suite de contrato reutilizável para o port `DocumentStorage`.
 *
 * - Este arquivo NÃO é descoberto pelo runner de testes (`*.test.ts` apenas).
 * - Adapters futuros (CTR-STORAGE-INMEMORY, CTR-STORAGE-S3-ADAPTER) consomem esta
 *   função-fábrica para garantir comportamento equivalente.
 *
 * Uso esperado por um adapter:
 *
 *   import { documentStorageContract } from
 *     '../../../../tests/modules/contracts/application/ports/document-storage.contract.ts';
 *
 *   describe('InMemoryDocumentStorage', () => {
 *     documentStorageContract(() => buildInMemoryStorage());
 *   });
 *
 * Cenários cobertos (do request CTR-STORAGE-PORT, seção "Suite de contrato"):
 *   1. upload de bytes retorna StorageRef com hash correto
 *   2. download após upload retorna mesmos bytes (round-trip)
 *   3. upload com expectedSha256 correto sucede
 *   4. upload com expectedSha256 divergente retorna storage-integrity-mismatch
 *   5. download de ref inexistente retorna storage-not-found
 *   6. exists retorna true para ref existente, false para inexistente
 *   7. signedUrl com ttl <= 0 retorna storage-invalid-ttl
 *   8. signedUrl com ttl > 604800 retorna storage-invalid-ttl
 *   9. signedUrl com ttl válido retorna URL não-vazia
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';

import { isErr, isOk } from '#src/shared/index.ts';
import { BucketName } from '#src/modules/contracts/domain/shared/bucket-name.ts';
import { StorageKey } from '#src/modules/contracts/domain/shared/storage-key.ts';
import { StorageRef } from '#src/modules/contracts/domain/shared/storage-ref.ts';
import type { DocumentStorage } from '#src/modules/contracts/application/ports/document-storage.ts';

const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const mkBucket = () => {
  const r = BucketName.create('contracts-documents');
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

const mkKey = (raw: string) => {
  const r = StorageKey.create(raw);
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

const mkRef = (params: {
  bucket: ReturnType<typeof mkBucket>;
  key: ReturnType<typeof mkKey>;
  bytes: Uint8Array;
  mimeType: string;
}) => {
  const r = StorageRef.create({
    bucket: params.bucket,
    key: params.key,
    hashSha256: sha256Hex(params.bytes),
    sizeBytes: params.bytes.byteLength,
    mimeType: params.mimeType,
  });
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

/**
 * Declara todos os cenários do contrato. Cada chamada cria seu próprio storage
 * via `makeStorage()` — isolamento entre testes é responsabilidade do adapter
 * (ex.: InMemory devolve instância nova; S3 testcontainer limpa bucket entre runs).
 */
export const documentStorageContract = (makeStorage: () => DocumentStorage): void => {
  describe('DocumentStorage — contract', () => {
    it('upload — returns StorageRef whose hash equals sha256(bytes)', async () => {
      const storage = makeStorage();
      const bytes = new TextEncoder().encode('hello world');
      const result = await storage.upload({
        bucket: mkBucket(),
        key: mkKey('test/hello.txt'),
        bytes,
        mimeType: 'text/plain',
      });
      assert.equal(isOk(result), true);
      if (result.ok) {
        assert.equal(result.value.hashSha256, sha256Hex(bytes));
        assert.equal(result.value.sizeBytes, bytes.byteLength);
        assert.equal(result.value.mimeType, 'text/plain');
      }
    });

    it('download — round-trips the same bytes that were uploaded', async () => {
      const storage = makeStorage();
      const bytes = new TextEncoder().encode('round-trip payload');
      const uploaded = await storage.upload({
        bucket: mkBucket(),
        key: mkKey('test/round-trip.bin'),
        bytes,
        mimeType: 'application/octet-stream',
      });
      assert.equal(isOk(uploaded), true);
      if (!uploaded.ok) return;
      const downloaded = await storage.download(uploaded.value);
      assert.equal(isOk(downloaded), true);
      if (downloaded.ok) {
        assert.deepEqual(downloaded.value, bytes);
      }
    });

    it('upload — succeeds when expectedSha256 matches the actual hash', async () => {
      const storage = makeStorage();
      const bytes = new TextEncoder().encode('integrity ok');
      const expected = sha256Hex(bytes);
      const result = await storage.upload({
        bucket: mkBucket(),
        key: mkKey('test/integrity-ok.bin'),
        bytes,
        mimeType: 'application/octet-stream',
        expectedSha256: expected,
      });
      assert.equal(isOk(result), true);
    });

    it('upload — returns storage-integrity-mismatch when expectedSha256 diverges', async () => {
      const storage = makeStorage();
      const bytes = new TextEncoder().encode('integrity mismatch');
      // Hash diferente do real — todos zeros é seguro (não é sha256 de payload conhecido).
      const wrong = '0'.repeat(64);
      const result = await storage.upload({
        bucket: mkBucket(),
        key: mkKey('test/integrity-bad.bin'),
        bytes,
        mimeType: 'application/octet-stream',
        expectedSha256: wrong,
      });
      assert.equal(isErr(result), true);
      if (!result.ok) assert.equal(result.error, 'storage-integrity-mismatch');
    });

    it('download — returns storage-not-found when ref does not exist', async () => {
      const storage = makeStorage();
      const missing = mkRef({
        bucket: mkBucket(),
        key: mkKey('test/missing.bin'),
        bytes: new Uint8Array(),
        mimeType: 'application/octet-stream',
      });
      const result = await storage.download(missing);
      assert.equal(isErr(result), true);
      if (!result.ok) assert.equal(result.error, 'storage-not-found');
    });

    it('exists — returns true for stored ref and false for unknown ref', async () => {
      const storage = makeStorage();
      const bytes = new TextEncoder().encode('existence check');
      const uploaded = await storage.upload({
        bucket: mkBucket(),
        key: mkKey('test/exists.bin'),
        bytes,
        mimeType: 'application/octet-stream',
      });
      assert.equal(isOk(uploaded), true);
      if (!uploaded.ok) return;
      const present = await storage.exists(uploaded.value);
      assert.equal(isOk(present), true);
      if (present.ok) assert.equal(present.value, true);

      const missing = mkRef({
        bucket: mkBucket(),
        key: mkKey('test/never-uploaded.bin'),
        bytes: new Uint8Array(),
        mimeType: 'application/octet-stream',
      });
      const absent = await storage.exists(missing);
      assert.equal(isOk(absent), true);
      if (absent.ok) assert.equal(absent.value, false);
    });

    it('signedUrl — rejects ttl <= 0 with storage-invalid-ttl', async () => {
      const storage = makeStorage();
      const ref = mkRef({
        bucket: mkBucket(),
        key: mkKey('test/anything.bin'),
        bytes: new Uint8Array(),
        mimeType: 'application/octet-stream',
      });
      const zero = await storage.signedUrl(ref, 0);
      assert.equal(isErr(zero), true);
      if (!zero.ok) assert.equal(zero.error, 'storage-invalid-ttl');

      const negative = await storage.signedUrl(ref, -1);
      assert.equal(isErr(negative), true);
      if (!negative.ok) assert.equal(negative.error, 'storage-invalid-ttl');
    });

    it('signedUrl — rejects ttl > 604800 (7 days, S3 V4 signing limit)', async () => {
      const storage = makeStorage();
      const ref = mkRef({
        bucket: mkBucket(),
        key: mkKey('test/anything.bin'),
        bytes: new Uint8Array(),
        mimeType: 'application/octet-stream',
      });
      const result = await storage.signedUrl(ref, 604_801);
      assert.equal(isErr(result), true);
      if (!result.ok) assert.equal(result.error, 'storage-invalid-ttl');
    });

    it('signedUrl — returns a non-empty URL for a valid ttl', async () => {
      const storage = makeStorage();
      const bytes = new TextEncoder().encode('for signed url');
      const uploaded = await storage.upload({
        bucket: mkBucket(),
        key: mkKey('test/signed.bin'),
        bytes,
        mimeType: 'application/octet-stream',
      });
      assert.equal(isOk(uploaded), true);
      if (!uploaded.ok) return;
      const url = await storage.signedUrl(uploaded.value, 60);
      assert.equal(isOk(url), true);
      if (url.ok) {
        assert.equal(url.value instanceof URL, true);
        assert.notEqual(url.value.toString(), '');
      }
    });
  });
};
