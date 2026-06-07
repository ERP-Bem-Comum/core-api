/**
 * Port ProfilePhotoStorage (modulo auth, US6 - FR-012).
 *
 * Port proprio do auth (ADR-0006: nao importa o DocumentStorage de `contracts/`). Abstrai o storage
 * de objetos (S3/MinIO, ADR-0019) para a foto de perfil: o use case valida mime/tamanho e gera a key;
 * o adapter persiste os bytes. Type puro (Readonly de funcoes), sem `class`. ASCII puro.
 */

import type { Result } from '#src/shared/primitives/result.ts';

export type ProfilePhotoStorageError = 'photo-storage-unavailable';

export type UploadPhotoInput = Readonly<{
  key: string;
  bytes: Uint8Array;
  mimeType: string;
}>;

export type ProfilePhotoStorage = Readonly<{
  // `Uint8Array` nao tem variant `readonly` nativo no TS 6; `prefer-readonly-parameter-types` fica
  // desabilitada so aqui. Contrato: o adapter consome `bytes` sem mutar (mesmo padrao do DocumentStorage).
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  upload: (input: UploadPhotoInput) => Promise<Result<void, ProfilePhotoStorageError>>;
  remove: (key: string) => Promise<Result<void, ProfilePhotoStorageError>>;
}>;
