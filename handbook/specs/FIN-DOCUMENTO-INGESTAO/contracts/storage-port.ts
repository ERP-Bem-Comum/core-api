/**
 * Port: StoragePort
 * Responsabilidade: Abstrair armazenamento de arquivos (S3/MinIO).
 *
 * ADR-0019: AWS S3 + MinIO (dev). @aws-sdk/client-s3 é o cliente único.
 */

export type StoragePort = Readonly<{
  upload: (file: Readonly<Uint8Array>, fileName: string, contentType: string) => Promise<string>; // retorna URL
  delete: (url: string) => Promise<void>;
  getSignedUrl: (url: string, expirySeconds: number) => Promise<string>;
}>;
