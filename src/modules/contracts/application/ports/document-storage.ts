import type { Result } from '../../../../shared/primitives/result.ts';
import type { BucketName, StorageKey, StorageRef } from './document-storage.types.ts';

// Port do storage de documentos contratuais. Tipo puro (sem `class`, sem `this`).
// Adapters concretos (InMemory, S3-compatible) implementam este contrato em
// tickets sucessores. A linguagem (bucket/key/hash/presigned URL) é a Linguagem
// Ubíqua da fronteira — handbook §07 reconhece esse vocabulário como aceito no
// domínio, do mesmo modo que `Money.cents`.

export type DocumentStorageError =
  | 'storage-upload-failed'
  | 'storage-not-found'
  | 'storage-integrity-mismatch'
  | 'storage-invalid-ttl'
  | 'storage-unavailable'
  | 'storage-permission-denied';

export type UploadInput = Readonly<{
  bucket: BucketName;
  key: StorageKey;
  bytes: Uint8Array;
  mimeType: string;
  // Quando presente, adapter compara hash pós-upload e retorna
  // 'storage-integrity-mismatch' se divergir. Reservado para casos críticos
  // (assinatura digital, comprovantes legais).
  expectedSha256?: string;
}>;

export type DocumentStorage = Readonly<{
  // `Uint8Array` não tem variant `readonly` nativo no TypeScript 6, e
  // `Readonly<Uint8Array>` não impede `.set(0, x)`. A regra
  // `prefer-readonly-parameter-types` fica desabilitada apenas aqui — o
  // contrato é "adapter consome `bytes` sem mutar" e ESLint não consegue
  // expressar essa garantia para tipos não-readonly nativos.
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  upload: (input: UploadInput) => Promise<Result<StorageRef, DocumentStorageError>>;
  download: (ref: StorageRef) => Promise<Result<Uint8Array, DocumentStorageError>>;
  exists: (ref: StorageRef) => Promise<Result<boolean, DocumentStorageError>>;
  // ttlSeconds deve estar em (0, 604800]. AWS V4 signing rejeita acima de 7 dias.
  signedUrl: (ref: StorageRef, ttlSeconds: number) => Promise<Result<URL, DocumentStorageError>>;
}>;
