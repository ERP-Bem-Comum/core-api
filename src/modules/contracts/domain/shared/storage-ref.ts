import { type Result, ok, err } from '../../../../shared/result.ts';
import type { BucketName } from './bucket-name.ts';
import type { StorageKey } from './storage-key.ts';

// Value Object composto. Não é branded — não é um identificador, é um descritor
// dos bytes (bucket + key + hash + size + mime). `BucketName` e `StorageKey` já
// carregam invariantes; aqui validamos apenas hash, sizeBytes e mimeType.

export type StorageRef = Readonly<{
  bucket: BucketName;
  key: StorageKey;
  // SHA-256 em hex lowercase, 64 chars. Canonicalizar é responsabilidade do produtor.
  hashSha256: string;
  sizeBytes: number;
  mimeType: string;
}>;

export type StorageRefError =
  | 'storage-ref-invalid-hash'
  | 'storage-ref-negative-size'
  | 'storage-ref-non-integer-size'
  | 'storage-ref-empty-mime-type';

const SHA256_LOWER_HEX = /^[0-9a-f]{64}$/;

export type StorageRefInput = Readonly<{
  bucket: BucketName;
  key: StorageKey;
  hashSha256: string;
  sizeBytes: number;
  mimeType: string;
}>;

export const StorageRef = {
  create: (input: StorageRefInput): Result<StorageRef, StorageRefError> => {
    if (!SHA256_LOWER_HEX.test(input.hashSha256)) return err('storage-ref-invalid-hash');
    if (!Number.isInteger(input.sizeBytes)) return err('storage-ref-non-integer-size');
    if (input.sizeBytes < 0) return err('storage-ref-negative-size');
    if (input.mimeType.length === 0) return err('storage-ref-empty-mime-type');
    return ok({
      bucket: input.bucket,
      key: input.key,
      hashSha256: input.hashSha256,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
    });
  },
};
