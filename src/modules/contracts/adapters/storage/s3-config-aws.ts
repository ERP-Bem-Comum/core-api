/**
 * S3StorageConfig + awsS3Config (builder) + parseAwsS3Env (parser de env).
 *
 * Ticket: CTR-STORAGE-S3-ADAPTER (W1) / IAM-ROLE-S3 (issue #244).
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
 *   S3_ACCESS_KEY_ID        opcional — ausente junto com SECRET -> provider chain (IAM Role ECS/IMDS)
 *   S3_SECRET_ACCESS_KEY    opcional — ausente junto com ACCESS  -> provider chain (IAM Role ECS/IMDS)
 *   S3_FORCE_PATH_STYLE     opcional, default false para AWS real,
 *                           true se endpoint contem localhost/127.0.0.1/0.0.0.0
 *
 * Invariante de seguranca: apenas UM dos dois (XOR) presente e erro de config.
 * Ambos presentes  -> credenciais estaticas (dev/MinIO/Magalu).
 * Ambos ausentes   -> omite `credentials`, SDK resolve via provider chain (prod AWS ECS/IMDS).
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
  /** Ausente quando SDK deve resolver via provider chain (IAM Role ECS/IMDS — prod AWS). */
  accessKeyId?: string;
  /** Ausente quando SDK deve resolver via provider chain (IAM Role ECS/IMDS — prod AWS). */
  secretAccessKey?: string;
  forcePathStyle: boolean;
  /** Opt-in para Magalu Cloud (proximo ticket). Default undefined / false. */
  disableChunkedEncoding?: boolean;
}>;

export type AwsS3ConfigInput = Readonly<{
  region: string;
  bucket: BucketName;
  /** Ausente quando SDK deve resolver via provider chain (IAM Role ECS/IMDS — prod AWS). */
  accessKeyId?: string;
  /** Ausente quando SDK deve resolver via provider chain (IAM Role ECS/IMDS — prod AWS). */
  secretAccessKey?: string;
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
  // Credenciais opcionais: presentes -> estaticas (dev/MinIO/Magalu); ausentes -> provider chain.
  const base: S3StorageConfig = {
    endpoint,
    region: input.region,
    bucket: input.bucket,
    forcePathStyle,
  };
  if (input.accessKeyId !== undefined && input.secretAccessKey !== undefined) {
    return { ...base, accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey };
  }
  return base;
};

// ─── parseAwsS3Env ───────────────────────────────────────────────────────────

const ALWAYS_REQUIRED = ['S3_REGION', 'S3_BUCKET'] as const;

const isPresent = (v: string | undefined): v is string => v !== undefined && v !== '';

export const parseAwsS3Env = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<S3StorageConfig, AwsS3EnvError> => {
  // Campos sempre obrigatorios.
  for (const field of ALWAYS_REQUIRED) {
    if (!isPresent(env[field])) {
      return err({ tag: 'missing-env', field });
    }
  }

  // Capturar em variaveis locais: o TS estreita `string | undefined` → `string` via isPresent
  // aplicado a variavel local (nao a indexacao de ProcessEnv em linha).
  const rawKey = env['S3_ACCESS_KEY_ID'];
  const rawSecret = env['S3_SECRET_ACCESS_KEY'];

  // Invariante de seguranca XOR: se um esta presente o outro tambem deve estar.
  // Ambos ausentes -> provider chain (IAM Role); ambos presentes -> credenciais estaticas.
  // Apenas um presente -> config pela metade; rejeitar para evitar comportamento imprevisivel.
  if (isPresent(rawKey) && !isPresent(rawSecret)) {
    return err({ tag: 'missing-env', field: 'S3_SECRET_ACCESS_KEY' });
  }
  if (!isPresent(rawKey) && isPresent(rawSecret)) {
    return err({ tag: 'missing-env', field: 'S3_ACCESS_KEY_ID' });
  }

  const bucketRaw = env['S3_BUCKET'] ?? '';
  const bucketR = createBucketName(bucketRaw);
  if (!bucketR.ok) {
    return err({ tag: 'invalid-bucket', raw: bucketRaw, error: bucketR.error });
  }

  const endpointEnv = env['S3_ENDPOINT'];
  const forcePathStyleEnv = env['S3_FORCE_PATH_STYLE'];

  // Credenciais: injetadas apenas quando ambas presentes (evita `secretAccessKey: undefined`
  // dentro de `credentials` — cumpre exactOptionalPropertyTypes).
  // Apos os guards acima, se rawKey e string entao rawSecret tambem e string.
  const credentialInput: Pick<AwsS3ConfigInput, 'accessKeyId' | 'secretAccessKey'> =
    isPresent(rawKey) && isPresent(rawSecret)
      ? { accessKeyId: rawKey, secretAccessKey: rawSecret }
      : {};

  const baseInput: AwsS3ConfigInput = {
    region: env['S3_REGION'] ?? '',
    bucket: bucketR.value,
    ...credentialInput,
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
