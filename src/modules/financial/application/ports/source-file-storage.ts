import type { Result } from '../../../../shared/primitives/result.ts';
import type { SourceFileRef } from '../../domain/document/source-file-ref.ts';
import type { DocumentId } from '../../domain/shared/document-id.ts';

// Port de storage do comprovante-fonte (#62). PRÓPRIO do financial: `contracts/public-api` não expõe
// o port `DocumentStorage` nem os VOs branded `BucketName`/`StorageKey`, então o financial define o
// seu (ADR-0006) e o adapter concreto (S3) fala direto com `@aws-sdk/client-s3`. Recebe BYTES, nunca
// URL (ADR-0050). Devolve o VO `SourceFileRef` já pronto para o agregado.
export type SourceFileUploadInput = Readonly<{
  documentId: DocumentId;
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
}>;

export type SourceFileStorageError = 'source-file-upload-failed';

export type SourceFileStoragePort = Readonly<{
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- bytes: Uint8Array sem variant readonly no TS 6
  upload: (input: SourceFileUploadInput) => Promise<Result<SourceFileRef, SourceFileStorageError>>;
  // Compensação (F4): remove um comprovante já gravado quando o rascunho falha depois (best-effort).
  remove: (ref: SourceFileRef) => Promise<Result<void, SourceFileStorageError>>;
}>;
