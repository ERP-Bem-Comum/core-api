// Adapter S3/MinIO do LogoStorage (produção, ADR-0019). Port próprio (ADR-0006).
// upload -> PutObjectCommand; remove -> DeleteObjectCommand (idempotente).
// try/catch só aqui; resultado sempre Result<void, LogoStorageError>.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
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

  return { upload, remove };
};
