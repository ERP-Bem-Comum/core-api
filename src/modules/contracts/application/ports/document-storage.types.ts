import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Tipos auxiliares do port DocumentStorage (§3.H.3 DO H§35).
// Vivem junto ao port que os consome — não em domain/shared/ (DON'T H§34).
// Jargão de infra (S3/MinIO) não pertence ao domínio puro.
//
// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com:
//   import * as BucketName from '../../application/ports/document-storage.types.ts';
//   import * as StorageKey from '../../application/ports/document-storage.types.ts';
//   import * as StorageRef from '../../application/ports/document-storage.types.ts';

// ---------------------------------------------------------------------------
// BucketName
// ---------------------------------------------------------------------------
//
// Regras canônicas — refletem literalmente a documentação AWS S3:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html

export type BucketName = Brand<string, 'BucketName'>;

export type BucketNameError =
  | 'bucket-name-too-short'
  | 'bucket-name-too-long'
  | 'bucket-name-invalid-chars'
  | 'bucket-name-must-start-alphanumeric'
  | 'bucket-name-must-end-alphanumeric'
  | 'bucket-name-consecutive-dots'
  | 'bucket-name-ip-address-format'
  | 'bucket-name-reserved-prefix'
  | 'bucket-name-reserved-suffix';

const MIN_LEN = 3;
const MAX_LEN = 63;

const ALLOWED_CHARS = /^[a-z0-9.-]+$/;
const ALPHANUMERIC = /^[a-z0-9]$/;
const IPV4_SHAPE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

const RESERVED_PREFIXES: readonly string[] = ['xn--', 'sthree-configurator', 'sthree-'];
const RESERVED_SUFFIXES: readonly string[] = ['-s3alias', '--ol-s3'];

const startsWithAny = (s: string, list: readonly string[]): boolean =>
  list.some((p) => s.startsWith(p));

const endsWithAny = (s: string, list: readonly string[]): boolean =>
  list.some((p) => s.endsWith(p));

export const createBucketName = (raw: string): Result<BucketName, BucketNameError> => {
  if (raw.length < MIN_LEN) return err('bucket-name-too-short');
  if (raw.length > MAX_LEN) return err('bucket-name-too-long');
  if (!ALLOWED_CHARS.test(raw)) return err('bucket-name-invalid-chars');
  const first = raw.charAt(0);
  const last = raw.charAt(raw.length - 1);
  if (!ALPHANUMERIC.test(first)) return err('bucket-name-must-start-alphanumeric');
  if (!ALPHANUMERIC.test(last)) return err('bucket-name-must-end-alphanumeric');
  if (raw.includes('..')) return err('bucket-name-consecutive-dots');
  if (IPV4_SHAPE.test(raw)) return err('bucket-name-ip-address-format');
  if (startsWithAny(raw, RESERVED_PREFIXES)) return err('bucket-name-reserved-prefix');
  if (endsWithAny(raw, RESERVED_SUFFIXES)) return err('bucket-name-reserved-suffix');
  return ok(raw as BucketName);
};

// ---------------------------------------------------------------------------
// StorageKey
// ---------------------------------------------------------------------------
//
// Regras canônicas — refletem literalmente a documentação AWS S3:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html

export type StorageKey = Brand<string, 'StorageKey'>;

export type StorageKeyError =
  | 'storage-key-empty'
  | 'storage-key-too-long'
  | 'storage-key-leading-slash'
  | 'storage-key-double-slash'
  | 'storage-key-path-traversal'
  | 'storage-key-control-chars';

const MAX_BYTES = 1024;

// \x00–\x1F (caracteres de controle C0) e \x7F (DEL).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

export const createStorageKey = (raw: string): Result<StorageKey, StorageKeyError> => {
  if (raw.length === 0) return err('storage-key-empty');
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return err('storage-key-too-long');
  if (raw.startsWith('/')) return err('storage-key-leading-slash');
  if (raw.includes('//')) return err('storage-key-double-slash');
  if (raw.includes('..') || raw.includes('./')) return err('storage-key-path-traversal');
  if (CONTROL_CHARS.test(raw)) return err('storage-key-control-chars');
  return ok(raw as StorageKey);
};

// ---------------------------------------------------------------------------
// StorageRef
// ---------------------------------------------------------------------------

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

export const createStorageRef = (input: StorageRefInput): Result<StorageRef, StorageRefError> => {
  if (!SHA256_LOWER_HEX.test(input.hashSha256)) return err('storage-ref-invalid-hash');
  if (!Number.isInteger(input.sizeBytes)) return err('storage-ref-non-integer-size');
  if (input.sizeBytes < 0) return err('storage-ref-negative-size');
  if (input.mimeType.length === 0) return err('storage-ref-empty-mime-type');
  return ok(
    immutable({
      bucket: input.bucket,
      key: input.key,
      hashSha256: input.hashSha256,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
    }),
  );
};
