/**
 * S3StorageConfig + awsS3Config (builder) + parseAwsS3Env (parser de env).
 *
 * Ticket: CTR-STORAGE-S3-ADAPTER (W1).
 *
 * Um adapter (`createS3DocumentStorage`) + N endpoints (AWS S3, MinIO, Magalu).
 * Este modulo entrega o config builder AWS + parser de env vars padrao.
 * Magalu Cloud reusa o mesmo `S3StorageConfig` via `magaluCloudConfig` no
 * proximo ticket (`CTR-STORAGE-MAGALU-CONFIG`).
 *
 * Env vars (S3_*):
 *   S3_ENDPOINT             opcional, default https://s3.<region>.amazonaws.com
 *   S3_REGION               required
 *   S3_BUCKET               required, validado por createBucketName
 *   S3_ACCESS_KEY_ID        required
 *   S3_SECRET_ACCESS_KEY    required
 *   S3_FORCE_PATH_STYLE     opcional, default false para AWS real,
 *                           true se endpoint contem localhost/127.0.0.1/0.0.0.0
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import {
  createBucketName,
  type BucketName,
  type BucketNameError,
} from '../../application/ports/document-storage.types.ts';

// ─── types ───────────────────────────────────────────────────────────────────

export type S3StorageConfig = Readonly<{
  endpoint: string;
  region: string;
  bucket: BucketName;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  /** Opt-in para Magalu Cloud (proximo ticket). Default undefined / false. */
  disableChunkedEncoding?: boolean;
}>;

export type AwsS3ConfigInput = Readonly<{
  region: string;
  bucket: BucketName;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}>;

export type AwsS3EnvError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-bucket'; raw: string; error: BucketNameError }>;

// ─── helpers ─────────────────────────────────────────────────────────────────

const LOCAL_HOST_PATTERN = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/;

const inferForcePathStyle = (endpoint: string | undefined): boolean => {
  if (endpoint === undefined) return false;
  return LOCAL_HOST_PATTERN.test(endpoint);
};

const defaultEndpoint = (region: string): string => `https://s3.${region}.amazonaws.com`;

// ─── awsS3Config ─────────────────────────────────────────────────────────────

export const awsS3Config = (input: AwsS3ConfigInput): S3StorageConfig => {
  const endpoint = input.endpoint ?? defaultEndpoint(input.region);
  const forcePathStyle = input.forcePathStyle ?? inferForcePathStyle(input.endpoint);
  return {
    endpoint,
    region: input.region,
    bucket: input.bucket,
    accessKeyId: input.accessKeyId,
    secretAccessKey: input.secretAccessKey,
    forcePathStyle,
  };
};

// ─── parseAwsS3Env ───────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const;

export const parseAwsS3Env = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<S3StorageConfig, AwsS3EnvError> => {
  for (const field of REQUIRED_FIELDS) {
    const v = env[field];
    if (v === undefined || v === '') {
      return err({ tag: 'missing-env', field });
    }
  }

  const bucketRaw = env['S3_BUCKET'] ?? '';
  const bucketR = createBucketName(bucketRaw);
  if (!bucketR.ok) {
    return err({ tag: 'invalid-bucket', raw: bucketRaw, error: bucketR.error });
  }

  const endpointEnv = env['S3_ENDPOINT'];
  const forcePathStyleEnv = env['S3_FORCE_PATH_STYLE'];

  const baseInput = {
    region: env['S3_REGION'] ?? '',
    bucket: bucketR.value,
    accessKeyId: env['S3_ACCESS_KEY_ID'] ?? '',
    secretAccessKey: env['S3_SECRET_ACCESS_KEY'] ?? '',
  };

  const withEndpoint: AwsS3ConfigInput =
    endpointEnv !== undefined && endpointEnv !== ''
      ? { ...baseInput, endpoint: endpointEnv }
      : baseInput;

  const withForce: AwsS3ConfigInput =
    forcePathStyleEnv !== undefined && forcePathStyleEnv !== ''
      ? { ...withEndpoint, forcePathStyle: forcePathStyleEnv === 'true' }
      : withEndpoint;

  return ok(awsS3Config(withForce));
};
