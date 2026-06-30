/**
 * PasswordHash - branded type OPACO + smart constructor do modulo auth.
 *
 * Module-as-namespace (Padrao D): `import * as PasswordHash from '...password-hash.ts'`.
 *
 * Representa um hash JA computado pelo port PasswordHasher (X1). O dominio trata como opaco:
 * NAO computa, NAO verifica, NAO valida o formato interno do algoritmo (acoplaria ao adapter).
 * `fromString` reidrata de uma string (ex.: coluna `auth_user.password_hash`).
 *
 * Unica invariante de dominio: nao-vazio. Valor preservado byte-a-byte (sem normalizacao).
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type PasswordHash = Brand<string, 'PasswordHash'>;

export type PasswordHashError = 'password-hash-empty';

export const fromString = (raw: string): Result<PasswordHash, PasswordHashError> => {
  if (raw.trim().length === 0) return err('password-hash-empty');
  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4). Hash opaco preservado intacto.
  return ok(raw as PasswordHash);
};
