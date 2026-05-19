import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

// Regras canônicas — refletem literalmente a documentação AWS S3:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
// A regra "1 a 1024" é em BYTES UTF-8, não em code points. Defesa em profundidade
// adicional contra path traversal cobre adapters FS futuros (MinIO local, fixture).

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

export const StorageKey = {
  create: (raw: string): Result<StorageKey, StorageKeyError> => {
    if (raw.length === 0) return err('storage-key-empty');
    if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return err('storage-key-too-long');
    if (raw.startsWith('/')) return err('storage-key-leading-slash');
    if (raw.includes('//')) return err('storage-key-double-slash');
    if (raw.includes('..') || raw.includes('./')) return err('storage-key-path-traversal');
    if (CONTROL_CHARS.test(raw)) return err('storage-key-control-chars');
    return ok(raw as StorageKey);
  },
};
