/**
 * createS3DocumentStorage - adapter de producao do port DocumentStorage via
 * `@aws-sdk/client-s3` (configurable: AWS S3, MinIO local, Magalu Cloud).
 *
 * Ticket: CTR-STORAGE-S3-ADAPTER (W1).
 *
 * 4 commands:
 *   - upload    -> PutObjectCommand    (+ ChecksumSHA256 quando expectedSha256 fornecido)
 *   - download  -> GetObjectCommand    (+ .transformToByteArray() no Body)
 *   - exists    -> HeadObjectCommand   (catch NotFound -> ok(false))
 *   - signedUrl -> getSignedUrl(client, GetObjectCommand, { expiresIn })
 *
 * Heuristica de erros centralizada em mapS3Error. try/catch apenas dentro do
 * adapter; resultado e sempre Result<T, DocumentStorageError>.
 *
 * Defensive copy nos bytes via `.slice()` (alinhado com InMemory adapter).
 *
 * ASCII puro.
 */

import { createHash } from 'node:crypto';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  DocumentStorage,
  DocumentStorageError,
  UploadInput,
} from '../../application/ports/document-storage.ts';
import type { StorageRef } from '../../application/ports/document-storage.types.ts';

import type { S3StorageConfig } from './s3-config-aws.ts';
import { mapS3Error } from './s3-error-mapper.ts';

const TTL_MAX_INCLUSIVE = 604_800; // 7 dias (cap AWS V4 signing)

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const sha256hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const hexToBase64 = (hex: string): string => Buffer.from(hex, 'hex').toString('base64');

export const createS3DocumentStorage = (config: S3StorageConfig): DocumentStorage => {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  const upload = async (input: UploadInput): Promise<Result<StorageRef, DocumentStorageError>> => {
    const copy = input.bytes.slice();
    const hash = sha256hex(copy);
    if (input.expectedSha256 !== undefined && input.expectedSha256 !== hash) {
      return err('storage-integrity-mismatch');
    }

    const baseCmd = {
      Bucket: String(input.bucket),
      Key: String(input.key),
      Body: copy,
      ContentType: input.mimeType,
    };
    const cmdInput =
      input.expectedSha256 !== undefined
        ? { ...baseCmd, ChecksumSHA256: hexToBase64(hash) }
        : baseCmd;

    try {
      await client.send(new PutObjectCommand(cmdInput));
      return ok({
        bucket: input.bucket,
        key: input.key,
        hashSha256: hash,
        sizeBytes: copy.length,
        mimeType: input.mimeType,
      });
    } catch (caught) {
      return err(mapS3Error(caught));
    }
  };

  const download = async (ref: StorageRef): Promise<Result<Uint8Array, DocumentStorageError>> => {
    try {
      const out = await client.send(
        new GetObjectCommand({
          Bucket: String(ref.bucket),
          Key: String(ref.key),
        }),
      );
      if (out.Body === undefined) {
        return err('storage-not-found');
      }
      const bytes = await out.Body.transformToByteArray();
      return ok(bytes);
    } catch (caught) {
      return err(mapS3Error(caught));
    }
  };

  const exists = async (ref: StorageRef): Promise<Result<boolean, DocumentStorageError>> => {
    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: String(ref.bucket),
          Key: String(ref.key),
        }),
      );
      return ok(true);
    } catch (caught) {
      const mapped = mapS3Error(caught);
      if (mapped === 'storage-not-found') return ok(false);
      return err(mapped);
    }
  };

  const signedUrl = async (
    ref: StorageRef,
    ttlSeconds: number,
  ): Promise<Result<URL, DocumentStorageError>> => {
    if (ttlSeconds <= 0 || ttlSeconds > TTL_MAX_INCLUSIVE) {
      return err('storage-invalid-ttl');
    }
    try {
      const cmd = new GetObjectCommand({
        Bucket: String(ref.bucket),
        Key: String(ref.key),
      });
      const urlString = await getSignedUrl(client, cmd, { expiresIn: ttlSeconds });
      return ok(new URL(urlString));
    } catch (caught) {
      return err(mapS3Error(caught));
    }
  };

  return { upload, download, exists, signedUrl };
};
