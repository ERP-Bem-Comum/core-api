/**
 * Integracao - createS3LogoStorage via MinIO (PRG-LOGO-CONTENT). Gated STORAGE_INTEGRATION=1.
 *
 * Prova que o adapter S3 do logo faz round-trip upload -> download contra storage S3-compat real:
 * bytes identicos + ContentType gravado no upload. Bucket dinamico criado/destruido por run
 * (isolamento). Endpoint via S3_ENDPOINT (default localhost:9000). Espelha exatamente o gate/skip
 * de profile-photo-storage.s3.integration.test.ts.
 *
 * Rodar: pnpm run test:integration:logo (ou STORAGE_INTEGRATION=1 ... este arquivo)
 * ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

import { createS3LogoStorage } from '#src/modules/programs/adapters/storage/logo-storage.s3.ts';

const integrationOn = process.env['STORAGE_INTEGRATION'] === '1';

const ENDPOINT = process.env['S3_ENDPOINT'] ?? 'http://localhost:9000';
const REGION = 'us-east-1';
const ACCESS_KEY = process.env['MINIO_ROOT_USER'] ?? 'dev-access-key';
const SECRET_KEY = process.env['MINIO_ROOT_PASSWORD'] ?? 'dev-secret-key-min-8-chars';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);

if (!integrationOn) {
  describe('logo s3 (integration SKIP)', () => {
    it.skip('SKIP - STORAGE_INTEGRATION=1 desligado', () => {
      // intencionalmente vazio
    });
  });
} else {
  const bucket = `programs-logo-test-${randomUUID().slice(0, 8)}`;
  const admin = new S3Client({
    endpoint: ENDPOINT,
    region: REGION,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    forcePathStyle: true,
  });
  const storage = createS3LogoStorage({
    endpoint: ENDPOINT,
    region: REGION,
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
    bucket,
    forcePathStyle: true,
  });
  const KEY = 'programs/integration-program/logo';

  describe('createS3LogoStorage — MinIO', () => {
    before(async () => {
      await admin.send(new CreateBucketCommand({ Bucket: bucket }));
    });

    after(async () => {
      const list = await admin.send(new ListObjectsV2Command({ Bucket: bucket }));
      const objects = (list.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => typeof k === 'string');
      if (objects.length > 0) {
        await admin.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objects.map((Key) => ({ Key })) },
          }),
        );
      }
      await admin.send(new DeleteBucketCommand({ Bucket: bucket }));
      admin.destroy();
    });

    it('CA1: upload persiste o objeto no bucket', async () => {
      const r = await storage.upload({ key: KEY, bytes: PNG, mimeType: 'image/png' });
      assert.equal(r.ok, true);
      const head = await admin.send(new HeadObjectCommand({ Bucket: bucket, Key: KEY }));
      assert.equal(head.ContentType, 'image/png');
    });

    // PRG-LOGO-CONTENT: round-trip de leitura (servir o logo). Roda apos CA1 (objeto presente).
    it('CA1b: download devolve bytes identicos + ContentType gravado no upload', async () => {
      const r = await storage.download(KEY);
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.deepEqual(new Uint8Array(r.value.bytes), PNG);
        assert.equal(r.value.contentType, 'image/png');
      }
    });

    it('CA1c: download de key inexistente -> logo-object-missing', async () => {
      const r = await storage.download('programs/nao-existe/logo');
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'logo-object-missing');
    });

    it('CA2: remove apaga o objeto', async () => {
      const r = await storage.remove(KEY);
      assert.equal(r.ok, true);
      await assert.rejects(admin.send(new HeadObjectCommand({ Bucket: bucket, Key: KEY })));
    });
  });
}
