/**
 * Suite contratual parametrica do port DocumentStorage.
 *
 * Funcao factory `(label, setup) => void` chamada dentro de `describe()` do
 * consumer. NAO roda direto — extensao `.contract.ts` (nao `.test.ts`) garante
 * que o test runner nao a descobre como entry point.
 *
 * Consumers:
 *   - tests/modules/contracts/adapters/storage/in-memory.test.ts
 *   - tests/modules/contracts/adapters/storage/s3.integration.test.ts
 *
 * Cobre o subconjunto **agnostico de implementacao** do port (CA-C1..C8).
 * Cenarios especificos (defensive copy interna, helpers de teste) ficam nos
 * test files individuais.
 *
 * Ticket: CTR-STORAGE-S3-ADAPTER (W0).
 *
 * ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';

import type { DocumentStorage } from '#src/modules/contracts/application/ports/document-storage.ts';
import type {
  BucketName,
  StorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import type { Result } from '#src/shared/primitives/result.ts';

// -----------------------------------------------------------------------------
// helpers locais (a suite e self-contained — nao depende de fixtures externas)
// -----------------------------------------------------------------------------

const sha256hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const fromOk = <T, E>(r: Result<T, E>, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label} invalida: ${JSON.stringify(r.error)}`);
  return r.value;
};

const SHA256_LOWER_HEX = /^[0-9a-f]{64}$/;

// -----------------------------------------------------------------------------
// API publica
// -----------------------------------------------------------------------------

export type ContractContext = Readonly<{
  bucket: BucketName;
  /** Gera StorageKey unico por test usando o suffix. Implementacoes garantem prefixo de isolamento. */
  makeKey: (suffix: string) => StorageKey;
}>;

export type ContractSetup = Readonly<{
  storage: DocumentStorage;
  ctx: ContractContext;
  /** Opcional: cleanup global apos os tests (ex.: deletar bucket S3 dinamico). */
  cleanup?: () => Promise<void>;
}>;

export const runDocumentStorageContract = (
  label: string,
  setup: () => Promise<ContractSetup>,
): void => {
  describe(`DocumentStorage contract - ${label}`, () => {
    let env: ContractSetup;

    before(async () => {
      env = await setup();
    });

    after(async () => {
      if (env.cleanup !== undefined) {
        await env.cleanup();
      }
    });

    it('CA-C1: upload retorna ok(StorageRef) com hash/size/mime corretos', async () => {
      // Arrange
      const bytes = new Uint8Array([72, 73]); // "HI"
      const key = env.ctx.makeKey('ca-c1.bin');

      // Act
      const r = await env.storage.upload({
        bucket: env.ctx.bucket,
        key,
        bytes,
        mimeType: 'application/octet-stream',
      });

      // Assert
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value.bucket, env.ctx.bucket);
        assert.equal(r.value.sizeBytes, 2);
        assert.match(r.value.hashSha256, SHA256_LOWER_HEX);
        assert.equal(r.value.hashSha256, sha256hex(bytes));
        assert.equal(r.value.mimeType, 'application/octet-stream');
      }
    });

    it('CA-C2: upload + download retorna ok(Uint8Array) com mesmos bytes', async () => {
      // Arrange
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const up = await env.storage.upload({
        bucket: env.ctx.bucket,
        key: env.ctx.makeKey('ca-c2.bin'),
        bytes,
        mimeType: 'application/octet-stream',
      });
      const ref = fromOk(up, 'CA-C2 upload');

      // Act
      const r = await env.storage.download(ref);

      // Assert
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.deepEqual(Array.from(r.value), Array.from(bytes));
      }
    });

    it('CA-C3: upload com expectedSha256 divergente retorna storage-integrity-mismatch', async () => {
      // Arrange
      const bytes = new Uint8Array([72, 73]);

      // Act
      const r = await env.storage.upload({
        bucket: env.ctx.bucket,
        key: env.ctx.makeKey('ca-c3.bin'),
        bytes,
        mimeType: 'application/octet-stream',
        expectedSha256: 'deadbeef'.repeat(8), // hash sintetico, nao bate com sha256(bytes)
      });

      // Assert
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.error, 'storage-integrity-mismatch');
      }
    });

    it('CA-C4: download de chave inexistente retorna storage-not-found', async () => {
      // Arrange — refer a chave que nunca foi uploaded
      const phantomRef = {
        bucket: env.ctx.bucket,
        key: env.ctx.makeKey('ca-c4-phantom.bin'),
        hashSha256: sha256hex(new Uint8Array([0])),
        sizeBytes: 1,
        mimeType: 'application/octet-stream',
      } as const;

      // Act
      const r = await env.storage.download(phantomRef);

      // Assert
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.error, 'storage-not-found');
      }
    });

    it('CA-C5: exists retorna ok(true) apos upload, ok(false) para inexistente', async () => {
      // Arrange
      const up = await env.storage.upload({
        bucket: env.ctx.bucket,
        key: env.ctx.makeKey('ca-c5.bin'),
        bytes: new Uint8Array([1]),
        mimeType: 'application/octet-stream',
      });
      const ref = fromOk(up, 'CA-C5 upload');
      const phantomRef = {
        bucket: env.ctx.bucket,
        key: env.ctx.makeKey('ca-c5-phantom.bin'),
        hashSha256: sha256hex(new Uint8Array([0])),
        sizeBytes: 1,
        mimeType: 'application/octet-stream',
      } as const;

      // Act
      const rExist = await env.storage.exists(ref);
      const rPhantom = await env.storage.exists(phantomRef);

      // Assert
      assert.equal(rExist.ok, true);
      if (rExist.ok) assert.equal(rExist.value, true);
      assert.equal(rPhantom.ok, true);
      if (rPhantom.ok) assert.equal(rPhantom.value, false);
    });

    it('CA-C6: signedUrl(ref, 3600) retorna ok(URL) bem-formada', async () => {
      // Arrange
      const up = await env.storage.upload({
        bucket: env.ctx.bucket,
        key: env.ctx.makeKey('ca-c6.bin'),
        bytes: new Uint8Array([1]),
        mimeType: 'application/octet-stream',
      });
      const ref = fromOk(up, 'CA-C6 upload');

      // Act
      const r = await env.storage.signedUrl(ref, 3600);

      // Assert
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.ok(r.value instanceof URL, 'signedUrl deve retornar instancia de URL');
        assert.ok(
          r.value.protocol === 'https:' || r.value.protocol === 'http:',
          `protocol esperado http/https; obtido: ${r.value.protocol}`,
        );
        assert.ok(r.value.toString().length > 0, 'URL nao pode ser vazia');
      }
    });

    it('CA-C7: signedUrl(ref, 0) retorna storage-invalid-ttl', async () => {
      // Arrange
      const up = await env.storage.upload({
        bucket: env.ctx.bucket,
        key: env.ctx.makeKey('ca-c7.bin'),
        bytes: new Uint8Array([1]),
        mimeType: 'application/octet-stream',
      });
      const ref = fromOk(up, 'CA-C7 upload');

      // Act
      const r = await env.storage.signedUrl(ref, 0);

      // Assert
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.error, 'storage-invalid-ttl');
      }
    });

    it('CA-C8: signedUrl(ref, 604801) retorna storage-invalid-ttl (>7 dias)', async () => {
      // Arrange
      const up = await env.storage.upload({
        bucket: env.ctx.bucket,
        key: env.ctx.makeKey('ca-c8.bin'),
        bytes: new Uint8Array([1]),
        mimeType: 'application/octet-stream',
      });
      const ref = fromOk(up, 'CA-C8 upload');

      // Act
      const r = await env.storage.signedUrl(ref, 604801);

      // Assert
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.error, 'storage-invalid-ttl');
      }
    });
  });
};
