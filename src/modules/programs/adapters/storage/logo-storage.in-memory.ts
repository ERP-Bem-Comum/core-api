// Adapter in-memory do LogoStorage (testes + driver memory). Map indexado pela key;
// `remove` idempotente. Helpers (size/get) para asserts de teste.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  DownloadedLogo,
  LogoDownloadError,
  LogoStorage,
  LogoStorageError,
  UploadLogoInput,
} from '#src/modules/programs/application/ports/logo-storage.ts';

type StoredLogo = Readonly<{ bytes: Uint8Array; mimeType: string }>;

export type InMemoryLogoStorage = LogoStorage &
  Readonly<{
    size: () => number;
    get: (key: string) => StoredLogo | undefined;
  }>;

export const makeInMemoryLogoStorage = (): InMemoryLogoStorage => {
  const blobs = new Map<string, StoredLogo>();

  const upload = async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    input: UploadLogoInput,
  ): Promise<Result<void, LogoStorageError>> => {
    await Promise.resolve();
    blobs.set(input.key, { bytes: input.bytes, mimeType: input.mimeType });
    return ok(undefined);
  };

  const remove = async (key: string): Promise<Result<void, LogoStorageError>> => {
    await Promise.resolve();
    blobs.delete(key);
    return ok(undefined);
  };

  const download = async (key: string): Promise<Result<DownloadedLogo, LogoDownloadError>> => {
    await Promise.resolve();
    const stored = blobs.get(key);
    if (stored === undefined) return err('logo-object-missing');
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
