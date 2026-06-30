/**
 * Integração - createS3ProfilePhotoStorage via MinIO (spec 005 US6). Gated STORAGE_INTEGRATION=1.
 *
 * Prova que o adapter S3 da foto (PutObject/DeleteObject) funciona contra storage S3-compat real.
 * Bucket dinâmico criado/destruído por run (isolamento). O port não tem download/exists; a verificação
 * usa o S3Client admin (HeadObjectCommand). Endpoint via S3_ENDPOINT (default localhost:9000).
 *
 * Rodar: pnpm run test:integration:photo
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

import { createS3ProfilePhotoStorage } from '#src/modules/auth/adapters/storage/profile-photo-storage.s3.ts';

const integrationOn = process.env['STORAGE_INTEGRATION'] === '1';

const ENDPOINT = process.env['S3_ENDPOINT'] ?? 'http://localhost:9000';
const REGION = 'us-east-1';
const ACCESS_KEY = process.env['MINIO_ROOT_USER'] ?? 'dev-access-key';
const SECRET_KEY = process.env['MINIO_ROOT_PASSWORD'] ?? 'dev-secret-key-min-8-chars';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

if (!integrationOn) {
  describe('profile-photo s3 (integration SKIP)', () => {
    it.skip('SKIP - STORAGE_INTEGRATION=1 desligado', () => {
      // intencionalmente vazio
    });
  });
} else {
  const bucket = `auth-photo-test-${randomUUID().slice(0, 8)}`;
  const admin = new S3Client({
    endpoint: ENDPOINT,
    region: REGION,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    forcePathStyle: true,
  });
  const storage = createS3ProfilePhotoStorage({
    endpoint: ENDPOINT,
    region: REGION,
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
    bucket,
    forcePathStyle: true,
  });
  const KEY = 'users/integration-user';

  describe('createS3ProfilePhotoStorage — MinIO', () => {
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
      const r = await storage.upload({ key: KEY, bytes: JPEG, mimeType: 'image/jpeg' });
      assert.equal(r.ok, true);
      const head = await admin.send(new HeadObjectCommand({ Bucket: bucket, Key: KEY }));
      assert.equal(head.ContentType, 'image/jpeg');
    });

    // USR-ME-PHOTO-DISPLAY: round-trip de leitura (servir a foto). Roda apos CA1 (objeto presente).
    it('CA1b: download devolve bytes identicos + ContentType gravado no upload', async () => {
      const r = await storage.download(KEY);
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.deepEqual(new Uint8Array(r.value.bytes), JPEG);
        assert.equal(r.value.contentType, 'image/jpeg');
      }
    });

    it('CA1c: download de key inexistente -> photo-object-missing', async () => {
      const r = await storage.download('users/nao-existe-display');
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'photo-object-missing');
    });

    it('CA2: remove apaga o objeto', async () => {
      const r = await storage.remove(KEY);
      assert.equal(r.ok, true);
      await assert.rejects(admin.send(new HeadObjectCommand({ Bucket: bucket, Key: KEY })));
    });

    it('CA3: remove de key inexistente e idempotente (ok)', async () => {
      const r = await storage.remove('users/nao-existe');
      assert.equal(r.ok, true);
    });
  });
}
