/**
 * Adapter S3/MinIO do ProfilePhotoStorage (producao, ADR-0019).
 *
 * Port proprio do auth (ADR-0006: nao reusa o DocumentStorage de contracts). 2 commands:
 *   upload -> PutObjectCommand ; remove -> DeleteObjectCommand (idempotente: NoSuchKey -> ok).
 * try/catch so aqui; resultado sempre Result<void, ProfilePhotoStorageError>. ASCII puro.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  ProfilePhotoStorage,
  ProfilePhotoStorageError,
  UploadPhotoInput,
} from '#src/modules/auth/application/ports/profile-photo-storage.ts';

export type ProfilePhotoS3Config = Readonly<{
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}>;

export const createS3ProfilePhotoStorage = (config: ProfilePhotoS3Config): ProfilePhotoStorage => {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: config.forcePathStyle,
  });

  const upload = async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    input: UploadPhotoInput,
  ): Promise<Result<void, ProfilePhotoStorageError>> => {
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
      return err('photo-storage-unavailable');
    }
  };

  const remove = async (key: string): Promise<Result<void, ProfilePhotoStorageError>> => {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
      return ok(undefined);
    } catch {
      return err('photo-storage-unavailable');
    }
  };

  return { upload, remove };
};
