import { createHash } from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ok, err } from '../../../../shared/primitives/result.ts';
import type { S3StorageConfig } from '#src/modules/contracts/public-api/index.ts';
import * as SourceFileRef from '../../domain/document/source-file-ref.ts';
import type { SourceFileStoragePort } from '../../application/ports/source-file-storage.ts';

// Adapter S3 do comprovante-fonte (#62, ADR-0019). Fala DIRETO com `@aws-sdk/client-s3` — não reusa o
// `DocumentStorage` de contracts porque este exige os VOs branded `BucketName`/`StorageKey`, não
// exportados no public-api (ADR-0006: cada módulo é dono do seu adapter). Reusa apenas o
// `S3StorageConfig` (+ `parseAwsS3Env`), esses sim exportados.
export type S3SourceFileStorageConfig = Readonly<{
  s3: S3StorageConfig;
  keyPrefix: string;
}>;

export const createS3SourceFileStorage = (
  config: S3SourceFileStorageConfig,
): SourceFileStoragePort => {
  const bucket = String(config.s3.bucket);
  const client = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    // Credenciais só quando presentes; ausentes → provider chain (IAM Role ECS/IMDS — prod AWS).
    ...(config.s3.accessKeyId !== undefined
      ? {
          credentials: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey ?? '',
          },
        }
      : {}),
    forcePathStyle: config.s3.forcePathStyle,
  });

  return {
    upload: async (input) => {
      const key = `${config.keyPrefix}/${String(input.documentId)}/${input.fileName}`;
      const bytes = input.bytes.slice();
      const hashSha256 = createHash('sha256').update(bytes).digest('hex');
      // F1 (CWE-22): valida a key (anti-traversal do fileName) ANTES de gravar — nunca escreve com
      // key hostil. F3 (CWE-354): ChecksumSHA256 dá integridade pós-upload (defesa em profundidade).
      const ref = SourceFileRef.create({
        bucket,
        key,
        hashSha256,
        sizeBytes: bytes.length,
        mimeType: input.mimeType,
      });
      if (!ref.ok) return err('source-file-upload-failed');
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: input.mimeType,
            ChecksumSHA256: Buffer.from(hashSha256, 'hex').toString('base64'),
          }),
        );
      } catch {
        return err('source-file-upload-failed');
      }
      return ok(ref.value);
    },
    remove: async (ref) => {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: ref.key }));
        return ok(undefined);
      } catch {
        return err('source-file-upload-failed');
      }
    },
  };
};
