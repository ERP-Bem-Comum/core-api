// Port LogoStorage do módulo programs (FR-021). Port próprio (ADR-0006: não reusa o
// DocumentStorage de contracts). Abstrai o object storage (S3/MinIO, ADR-0019): o use case
// valida mime/tamanho e gera a key; o adapter persiste os bytes. Type puro, sem class.

import type { Result } from '#src/shared/primitives/result.ts';

export type LogoStorageError = 'logo-storage-unavailable';

// Download distingue objeto ausente (404 na borda) de storage fora do ar (503).
export type LogoDownloadError = 'logo-object-missing' | LogoStorageError;

export type UploadLogoInput = Readonly<{
  key: string;
  bytes: Uint8Array;
  mimeType: string;
}>;

export type DownloadedLogo = Readonly<{ bytes: Uint8Array; contentType: string }>;

export type LogoStorage = Readonly<{
  // `Uint8Array` não tem variant `readonly` nativo no TS 6; o adapter consome `bytes` sem mutar.
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  upload: (input: UploadLogoInput) => Promise<Result<void, LogoStorageError>>;
  remove: (key: string) => Promise<Result<void, LogoStorageError>>;
  download: (key: string) => Promise<Result<DownloadedLogo, LogoDownloadError>>;
}>;
