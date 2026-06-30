/**
 * W0 (RED) - Tests para magaluCloudConfig + parseMagaluCloudEnv.
 *
 * Ticket: CTR-STORAGE-MAGALU-CONFIG.
 *
 * Cobre CA-T31..T38:
 *   T31 - magaluCloudConfig regiao 'br-ne1' (default) -> endpoint NE1, forcePathStyle=true
 *   T32 - magaluCloudConfig regiao 'br-se1' -> endpoint SE1
 *   T33 - smoke type: config retorna S3StorageConfig aceitavel por createS3DocumentStorage
 *   T34 - parseMagaluCloudEnv com env completo -> ok regiao 'br-ne1' (default)
 *   T35 - parseMagaluCloudEnv com MAGALU_REGION='br-se1' -> ok regiao SE1
 *   T36 - parseMagaluCloudEnv sem MAGALU_REGION -> ok default 'br-ne1'
 *   T37 - parseMagaluCloudEnv com MAGALU_REGION='invalid' -> err invalid-region
 *   T38 - parseMagaluCloudEnv sem MAGALU_BUCKET -> err missing-env
 *
 * Estes tests DEVEM FALHAR em W0 - magalu-cloud-config.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  magaluCloudConfig,
  parseMagaluCloudEnv,
} from '#src/modules/contracts/adapters/storage/magalu-cloud-config.ts';
import { createBucketName } from '#src/modules/contracts/application/ports/document-storage.types.ts';
import type { S3StorageConfig } from '#src/modules/contracts/adapters/storage/s3-config-aws.ts';
import { createS3DocumentStorage } from '#src/modules/contracts/adapters/storage/document-storage.s3.ts';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label} invalida: ${JSON.stringify(r.error)}`);
  return r.value;
};

const makeBucket = (): ReturnType<typeof createBucketName> extends infer R
  ? R extends { ok: true; value: infer V }
    ? V
    : never
  : never => fromOk(createBucketName('contracts-documents'), 'bucket');

const baseEnv = (): NodeJS.ProcessEnv => ({
  MAGALU_BUCKET: 'contracts-documents',
  MAGALU_ACCESS_KEY_ID: 'mgc-key-fake',
  MAGALU_SECRET_ACCESS_KEY: 'mgc-secret-fake',
});

describe('magaluCloudConfig', () => {
  it("CA-T31: regiao 'br-ne1' (default) retorna endpoint NE1 + forcePathStyle=true + disableChunkedEncoding=true", () => {
    // Act
    const config = magaluCloudConfig({
      region: 'br-ne1',
      bucket: makeBucket(),
      accessKeyId: 'mgc-key-fake',
      secretAccessKey: 'mgc-secret-fake',
    });

    // Assert
    assert.equal(config.endpoint, 'https://br-ne1.magaluobjects.com');
    assert.equal(config.region, 'br-ne1');
    assert.equal(config.forcePathStyle, true);
    assert.equal(config.disableChunkedEncoding, true);
  });

  it("CA-T32: regiao 'br-se1' retorna endpoint SE1", () => {
    // Act
    const config = magaluCloudConfig({
      region: 'br-se1',
      bucket: makeBucket(),
      accessKeyId: 'mgc-key-fake',
      secretAccessKey: 'mgc-secret-fake',
    });

    // Assert
    assert.equal(config.endpoint, 'https://br-se1.magaluobjects.com');
    assert.equal(config.region, 'br-se1');
    assert.equal(config.forcePathStyle, true);
  });

  it('CA-T33: smoke type-level - config e aceitavel por createS3DocumentStorage', () => {
    // Arrange + Act
    const config = magaluCloudConfig({
      region: 'br-ne1',
      bucket: makeBucket(),
      accessKeyId: 'mgc-key-fake',
      secretAccessKey: 'mgc-secret-fake',
    });
    // Type-check: config deve casar com S3StorageConfig
    const asS3: S3StorageConfig = config;
    const storage = createS3DocumentStorage(asS3);

    // Assert
    assert.equal(typeof storage.upload, 'function');
    assert.equal(typeof storage.download, 'function');
    assert.equal(typeof storage.exists, 'function');
    assert.equal(typeof storage.signedUrl, 'function');
  });
});

describe('parseMagaluCloudEnv', () => {
  it("CA-T34: env completo retorna ok com regiao default 'br-ne1'", () => {
    // Act
    const r = parseMagaluCloudEnv(baseEnv());

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.region, 'br-ne1');
      assert.equal(r.value.endpoint, 'https://br-ne1.magaluobjects.com');
      assert.equal(r.value.forcePathStyle, true);
      assert.equal(String(r.value.bucket), 'contracts-documents');
      assert.equal(r.value.accessKeyId, 'mgc-key-fake');
      assert.equal(r.value.secretAccessKey, 'mgc-secret-fake');
    }
  });

  it("CA-T35: MAGALU_REGION='br-se1' retorna ok com regiao SE1", () => {
    // Arrange
    const env = baseEnv();
    env['MAGALU_REGION'] = 'br-se1';

    // Act
    const r = parseMagaluCloudEnv(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.region, 'br-se1');
      assert.equal(r.value.endpoint, 'https://br-se1.magaluobjects.com');
    }
  });

  it("CA-T36: sem MAGALU_REGION retorna ok default 'br-ne1'", () => {
    // Arrange
    const env = baseEnv();
    delete env['MAGALU_REGION'];

    // Act
    const r = parseMagaluCloudEnv(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.region, 'br-ne1');
    }
  });

  it("CA-T37: MAGALU_REGION='invalid' retorna err invalid-region", () => {
    // Arrange
    const env = baseEnv();
    env['MAGALU_REGION'] = 'us-east-1';

    // Act
    const r = parseMagaluCloudEnv(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'invalid-region') {
      assert.equal(r.error.raw, 'us-east-1');
    } else {
      assert.fail(`esperado invalid-region; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T38: sem MAGALU_BUCKET retorna err missing-env field=MAGALU_BUCKET', () => {
    // Arrange
    const env = baseEnv();
    delete env['MAGALU_BUCKET'];

    // Act
    const r = parseMagaluCloudEnv(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(r.error.field, 'MAGALU_BUCKET');
    } else {
      assert.fail(`esperado missing-env MAGALU_BUCKET; obtido: ${JSON.stringify(r)}`);
    }
  });
});
