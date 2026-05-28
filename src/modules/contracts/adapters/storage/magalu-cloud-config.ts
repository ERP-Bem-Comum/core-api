/**
 * magaluCloudConfig + parseMagaluCloudEnv — config builders para Magalu Cloud
 * Object Storage (S3-compatible).
 *
 * Ticket: CTR-STORAGE-MAGALU-CONFIG (W1).
 *
 * Princípio (ADR-0019): 1 port, 1 adapter (`createS3DocumentStorage`),
 * N config builders. Magalu reusa o adapter S3 mudando apenas endpoint regional
 * + forcePathStyle=true (obrigatorio em Magalu).
 *
 * # Regioes disponiveis (Object Storage)
 *
 * Fonte: handbook/reference/magalu-cloud/object-storage/.
 *
 * - `br-ne1` (Nordeste 1): https://br-ne1.magaluobjects.com
 *   Confirmado em:
 *   - `how-to/buckets/create-list-delete-bucket.md:15`
 *   - `compatible-tools/terraform-configuration.md:71`
 * - `br-se1` (Sudeste 1): https://br-se1.magaluobjects.com
 *   Confirmado em `compatible-tools/sdk-compatibility.md:33`
 *
 * Default: `br-ne1`. Cold storage class so disponivel em SE1
 * (storage-classes/cold-storage.md:9) — sem impacto neste adapter (usa standard).
 *
 * # Segurança (recomendações do handbook)
 *
 * Fonte: `security/bestpractices.md` + `object-storage/access-control/overview.md`.
 *
 * 1. Bucket privado por default — documentos contratuais NUNCA devem ser public-read.
 *    Acesso temporario via `signedUrl` (entregue no adapter S3).
 * 2. Autenticacao via API Key Magalu (accessKeyId/secretAccessKey sao API Keys,
 *    nao credenciais de usuario).
 * 3. Bucket Policy (regras complexas) + ACL (granular) configurados via console
 *    Magalu ou IaC — fora do escopo do adapter.
 * 4. Versioning + Object Lock provisionados no bucket via IaC quando aplicavel.
 *
 * # Quirks
 *
 * `disableChunkedEncoding: true` setado por default — exigencia documentada para
 * uploads MULTIPART em alguns SDKs (compatible-tools/sdk-compatibility.md:102).
 * Para PutObjectCommand simples (escopo atual), nao impacta. Documentado para
 * ticket futuro de multipart upload.
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import {
  createBucketName,
  type BucketName,
  type BucketNameError,
} from '../../application/ports/document-storage.types.ts';
import type { S3StorageConfig } from './s3-config-aws.ts';

// ─── types ───────────────────────────────────────────────────────────────────

export type MagaluRegion = 'br-ne1' | 'br-se1';

export type MagaluCloudConfigInput = Readonly<{
  region: MagaluRegion;
  bucket: BucketName;
  accessKeyId: string;
  secretAccessKey: string;
}>;

export type MagaluCloudEnvError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-region'; raw: string }>
  | Readonly<{ tag: 'invalid-bucket'; raw: string; error: BucketNameError }>;

// ─── tabela de endpoints ─────────────────────────────────────────────────────

const ENDPOINTS: Readonly<Record<MagaluRegion, string>> = {
  'br-ne1': 'https://br-ne1.magaluobjects.com',
  'br-se1': 'https://br-se1.magaluobjects.com',
};

const DEFAULT_REGION: MagaluRegion = 'br-ne1';

const isMagaluRegion = (raw: string): raw is MagaluRegion => raw === 'br-ne1' || raw === 'br-se1';

// ─── magaluCloudConfig ───────────────────────────────────────────────────────

export const magaluCloudConfig = (input: MagaluCloudConfigInput): S3StorageConfig => ({
  endpoint: ENDPOINTS[input.region],
  region: input.region,
  bucket: input.bucket,
  accessKeyId: input.accessKeyId,
  secretAccessKey: input.secretAccessKey,
  forcePathStyle: true,
  disableChunkedEncoding: true,
});

// ─── parseMagaluCloudEnv ─────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  'MAGALU_BUCKET',
  'MAGALU_ACCESS_KEY_ID',
  'MAGALU_SECRET_ACCESS_KEY',
] as const;

export const parseMagaluCloudEnv = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<S3StorageConfig, MagaluCloudEnvError> => {
  for (const field of REQUIRED_FIELDS) {
    const v = env[field];
    if (v === undefined || v === '') {
      return err({ tag: 'missing-env', field });
    }
  }

  const regionRaw = env['MAGALU_REGION'];
  let region: MagaluRegion = DEFAULT_REGION;
  if (regionRaw !== undefined && regionRaw !== '') {
    if (!isMagaluRegion(regionRaw)) {
      return err({ tag: 'invalid-region', raw: regionRaw });
    }
    region = regionRaw;
  }

  const bucketRaw = env['MAGALU_BUCKET'] ?? '';
  const bucketR = createBucketName(bucketRaw);
  if (!bucketR.ok) {
    return err({ tag: 'invalid-bucket', raw: bucketRaw, error: bucketR.error });
  }

  return ok(
    magaluCloudConfig({
      region,
      bucket: bucketR.value,
      accessKeyId: env['MAGALU_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: env['MAGALU_SECRET_ACCESS_KEY'] ?? '',
    }),
  );
};
