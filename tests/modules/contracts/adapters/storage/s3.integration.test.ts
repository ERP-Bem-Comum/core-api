/**
 * W0 (RED) - Tests de integracao para createS3DocumentStorage via MinIO.
 *
 * Ticket: CTR-STORAGE-S3-ADAPTER.
 *
 * Consome a suite contratual `runDocumentStorageContract` contra MinIO local.
 * Bucket criado dinamicamente em `setup()` via `CreateBucketCommand`, deletado
 * em `cleanup()` (delete objects + delete bucket) garantindo isolamento entre
 * runs sequenciais.
 *
 * Guarded por STORAGE_INTEGRATION=1. Sem essa env, o describe entra em SKIP
 * silencioso (mas o IMPORT do adapter ainda quebra em W0 - garantindo RED).
 *
 * Rodar:
 *   pnpm run test:integration:storage
 *
 * Ou manualmente:
 *   STORAGE_INTEGRATION=1 docker compose up -d minio --wait
 *   STORAGE_INTEGRATION=1 node --test --experimental-strip-types --no-warnings \
 *     'tests/modules/contracts/adapters/storage/s3.integration.test.ts'
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';

import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

import { createS3DocumentStorage } from '#src/modules/contracts/adapters/storage/document-storage.s3.ts';
import { awsS3Config } from '#src/modules/contracts/adapters/storage/s3-config-aws.ts';
import {
  createBucketName,
  createStorageKey,
  type BucketName,
  type StorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import { runDocumentStorageContract } from './document-storage.contract.ts';

const integrationOn = process.env['STORAGE_INTEGRATION'] === '1';

const MINIO_ENDPOINT = 'http://localhost:9000';
const MINIO_REGION = 'us-east-1';
const MINIO_ACCESS_KEY = process.env['MINIO_ROOT_USER'] ?? 'dev-access-key';
const MINIO_SECRET_KEY = process.env['MINIO_ROOT_PASSWORD'] ?? 'dev-secret-key-min-8-chars';

if (!integrationOn) {
  describe('s3 (integration SKIP)', () => {
    it.skip('SKIP - STORAGE_INTEGRATION=1 desligado', () => {
      // intencionalmente vazio
    });
  });
} else {
  // Bucket dinamico para isolamento entre runs
  const bucketSlug = `ctr-test-${randomUUID().slice(0, 8)}`;
  const bucketResult = createBucketName(bucketSlug);
  if (!bucketResult.ok) {
    throw new Error(`bucket name invalido: ${JSON.stringify(bucketResult.error)}`);
  }
  const bucket: BucketName = bucketResult.value;

  const adminClient = new S3Client({
    endpoint: MINIO_ENDPOINT,
    region: MINIO_REGION,
    credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
    forcePathStyle: true,
  });

  const makeKey = (suffix: string): StorageKey => {
    const r = createStorageKey(`contracts/integration/${suffix}`);
    if (!r.ok) throw new Error(`key invalida: ${suffix}`);
    return r.value;
  };

  runDocumentStorageContract('s3-minio', async () => {
    // Setup: cria bucket + storage
    await adminClient.send(new CreateBucketCommand({ Bucket: bucketSlug }));

    const config = awsS3Config({
      region: MINIO_REGION,
      bucket,
      accessKeyId: MINIO_ACCESS_KEY,
      secretAccessKey: MINIO_SECRET_KEY,
      endpoint: MINIO_ENDPOINT,
      forcePathStyle: true,
    });
    const storage = createS3DocumentStorage(config);

    const cleanup = async (): Promise<void> => {
      // Lista e deleta todos os objetos antes de deletar o bucket
      const list = await adminClient.send(new ListObjectsV2Command({ Bucket: bucketSlug }));
      const objects = (list.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => typeof k === 'string');
      if (objects.length > 0) {
        await adminClient.send(
          new DeleteObjectsCommand({
            Bucket: bucketSlug,
            Delete: { Objects: objects.map((Key) => ({ Key })) },
          }),
        );
      }
      await adminClient.send(new DeleteBucketCommand({ Bucket: bucketSlug }));
      adminClient.destroy();
    };

    return {
      storage,
      ctx: { bucket, makeKey },
      cleanup,
    };
  });
}
