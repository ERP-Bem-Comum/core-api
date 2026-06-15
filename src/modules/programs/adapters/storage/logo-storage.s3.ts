// Adapter S3/MinIO do LogoStorage (produção, ADR-0019). Port próprio (ADR-0006).
// upload -> PutObjectCommand; remove -> DeleteObjectCommand (idempotente).
// try/catch só aqui; resultado sempre Result<void, LogoStorageError>.

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  DownloadedLogo,
  LogoDownloadError,
  LogoStorage,
  LogoStorageError,
  UploadLogoInput,
} from '#src/modules/programs/application/ports/logo-storage.ts';

export type LogoS3Config = Readonly<{
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}>;

export const createS3LogoStorage = (config: LogoS3Config): LogoStorage => {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: config.forcePathStyle,
  });

  const upload = async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    input: UploadLogoInput,
  ): Promise<Result<void, LogoStorageError>> => {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: input.key,
          Body: input.bytes.slice(),
          ContentType: input.mimeType,
        }),
      );
      return ok(undefined);
    } catch {
      return err('logo-storage-unavailable');
    }
  };

  const remove = async (key: string): Promise<Result<void, LogoStorageError>> => {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
      return ok(undefined);
    } catch {
      return err('logo-storage-unavailable');
    }
  };

  const download = async (key: string): Promise<Result<DownloadedLogo, LogoDownloadError>> => {
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
      if (res.Body === undefined) return err('logo-object-missing');
      const bytes = await res.Body.transformToByteArray();
      return ok({ bytes, contentType: res.ContentType ?? 'application/octet-stream' });
    } catch (cause) {
      // NoSuchKey (GetObject) / NotFound (S3-compat variantes) -> objeto ausente, nao indisponibilidade.
      const name = cause instanceof Error ? cause.name : '';
      if (name === 'NoSuchKey' || name === 'NotFound') return err('logo-object-missing');
      return err('logo-storage-unavailable');
    }
  };

  return { upload, remove, download };
};
