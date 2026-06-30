/**
 * Adapter in-memory do ProfilePhotoStorage (testes + driver memory).
 *
 * Guarda os bytes num Map indexado pela key. `remove` e idempotente (ausencia nao e erro).
 * Expoe helpers (`size`, `get`) para asserts de teste. ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  DownloadedPhoto,
  ProfilePhotoDownloadError,
  ProfilePhotoStorage,
  ProfilePhotoStorageError,
  UploadPhotoInput,
} from '#src/modules/auth/application/ports/profile-photo-storage.ts';

type StoredPhoto = Readonly<{ bytes: Uint8Array; mimeType: string }>;

export type InMemoryProfilePhotoStorage = ProfilePhotoStorage &
  Readonly<{
    size: () => number;
    get: (key: string) => StoredPhoto | undefined;
  }>;

export const makeInMemoryProfilePhotoStorage = (): InMemoryProfilePhotoStorage => {
  const blobs = new Map<string, StoredPhoto>();
  const upload = async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    input: UploadPhotoInput,
  ): Promise<Result<void, ProfilePhotoStorageError>> => {
    await Promise.resolve();
    blobs.set(input.key, { bytes: input.bytes, mimeType: input.mimeType });
    return ok(undefined);
  };
  const remove = async (key: string): Promise<Result<void, ProfilePhotoStorageError>> => {
    await Promise.resolve();
    blobs.delete(key);
    return ok(undefined);
  };
  const download = async (
    key: string,
  ): Promise<Result<DownloadedPhoto, ProfilePhotoDownloadError>> => {
    await Promise.resolve();
    const stored = blobs.get(key);
    if (stored === undefined) return err('photo-object-missing');
    return ok({ bytes: stored.bytes, contentType: stored.mimeType });
  };
  return {
    upload,
    remove,
    download,
    size: () => blobs.size,
    get: (key: string) => blobs.get(key),
  };
};
