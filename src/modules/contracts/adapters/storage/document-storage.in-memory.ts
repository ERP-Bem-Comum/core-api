/**
 * createInMemoryDocumentStorage - adapter de testes para DocumentStorage.
 *
 * Ticket: CTR-STORAGE-INMEMORY (W1).
 *
 * Persiste blobs em Map<string, StoredBlob> indexado por `${bucket}/${key}`.
 * Hash SHA-256 calculado via node:crypto no upload e verificado contra
 * `expectedSha256` quando fornecido. Defensive copy nos bytes em entrada e
 * saida - mutacao pelo caller nao afeta blob armazenado.
 *
 * `signedUrl` retorna URL fake `https://in-memory.local/{bucket}/{key}?expires=<ISO-8601>`.
 * Nao ha tracking de TTL real; objetivo e apenas garantir URL bem-formada para
 * tests dos use cases. TTL validado contra (0, 604800] (cap AWS V4 = 7 dias).
 *
 * Helpers `size`, `clear`, `getAllBlobs` seguem padrao observable test double
 * alinhado com InMemoryEventDelivery e createInMemoryEmailSender.
 *
 * ASCII puro.
 */

import { createHash } from 'node:crypto';

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  DocumentStorage,
  DocumentStorageError,
  UploadInput,
} from '../../application/ports/document-storage.ts';
import type {
  BucketName,
  StorageKey,
  StorageRef,
} from '../../application/ports/document-storage.types.ts';

type StoredBlob = Readonly<{
  bucket: BucketName;
  key: StorageKey;
  bytes: Uint8Array;
  mimeType: string;
  hashSha256: string;
}>;

export type InMemoryDocumentStorage = DocumentStorage &
  Readonly<{
    size: () => number;
    clear: () => void;
    getAllBlobs: () => readonly StoredBlob[];
  }>;

const SIGNED_URL_HOST = 'in-memory.local';
const TTL_MAX_INCLUSIVE = 604_800; // 7 dias em segundos (cap AWS V4 signing)

const composeKey = (bucket: BucketName, key: StorageKey): string =>
  `${String(bucket)}/${String(key)}`;

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const sha256hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export const createInMemoryDocumentStorage = (): InMemoryDocumentStorage => {
  const store = new Map<string, StoredBlob>();

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  const upload = async (input: UploadInput): Promise<Result<StorageRef, DocumentStorageError>> => {
    await Promise.resolve();
    const copy = input.bytes.slice();
    const hash = sha256hex(copy);
    if (input.expectedSha256 !== undefined && input.expectedSha256 !== hash) {
      return err('storage-integrity-mismatch');
    }
    const blob: StoredBlob = {
      bucket: input.bucket,
      key: input.key,
      bytes: copy,
      mimeType: input.mimeType,
      hashSha256: hash,
    };
    store.set(composeKey(input.bucket, input.key), blob);
    return ok({
      bucket: input.bucket,
      key: input.key,
      hashSha256: hash,
      sizeBytes: copy.length,
      mimeType: input.mimeType,
    });
  };

  const download = async (ref: StorageRef): Promise<Result<Uint8Array, DocumentStorageError>> => {
    await Promise.resolve();
    const blob = store.get(composeKey(ref.bucket, ref.key));
    if (blob === undefined) return err('storage-not-found');
    return ok(blob.bytes.slice());
  };

  const exists = async (ref: StorageRef): Promise<Result<boolean, DocumentStorageError>> => {
    await Promise.resolve();
    return ok(store.has(composeKey(ref.bucket, ref.key)));
  };

  const signedUrl = async (
    ref: StorageRef,
    ttlSeconds: number,
  ): Promise<Result<URL, DocumentStorageError>> => {
    await Promise.resolve();
    if (ttlSeconds <= 0 || ttlSeconds > TTL_MAX_INCLUSIVE) {
      return err('storage-invalid-ttl');
    }
    const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const url = new URL(`https://${SIGNED_URL_HOST}/${String(ref.bucket)}/${String(ref.key)}`);
    url.searchParams.set('expires', expires);
    return ok(url);
  };

  return {
    upload,
    download,
    exists,
    signedUrl,
    size: () => store.size,
    clear: () => {
      store.clear();
    },
    getAllBlobs: () =>
      Array.from(store.values()).map((b) => ({
        bucket: b.bucket,
        key: b.key,
        bytes: b.bytes.slice(),
        mimeType: b.mimeType,
        hashSha256: b.hashSha256,
      })),
  };
};
