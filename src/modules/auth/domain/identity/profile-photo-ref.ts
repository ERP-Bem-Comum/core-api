/**
 * ProfilePhotoRef - branded type + smart constructor do modulo auth.
 *
 * Module-as-namespace (Padrao D): consumir com `import * as ProfilePhotoRef from '...'`.
 *
 * Referencia (key) de um objeto no storage (S3/MinIO, ADR-0019). NAO contem o binario:
 * upload e validacao de mime/tamanho ocorrem no use case via StoragePort. Aqui validamos
 * apenas a chave (nao-vazia, limite de tamanho, sem path traversal / barra inicial - defesa
 * em profundidade). Modulo isolado (ADR-0006). ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type ProfilePhotoRef = Brand<string, 'ProfilePhotoRef'>;

export type ProfilePhotoRefError = 'photo-ref-empty' | 'photo-ref-too-long' | 'photo-ref-invalid';

const MAX_LENGTH = 1024;

export const parse = (raw: string): Result<ProfilePhotoRef, ProfilePhotoRefError> => {
  const key = raw.trim();
  if (key.length === 0) return err('photo-ref-empty');
  if (key.length > MAX_LENGTH) return err('photo-ref-too-long');
  if (key.startsWith('/') || key.includes('..')) return err('photo-ref-invalid');

  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4): borda do sistema de tipos.
  return ok(key as ProfilePhotoRef);
};
