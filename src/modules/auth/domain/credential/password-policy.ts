/**
 * Password - branded type + smart constructor (politica de forca) do modulo auth.
 *
 * Module-as-namespace (Padrao D): `import * as Password from '...password-policy.ts'`.
 *
 * `Password` e uma senha EM CLARO que passou na politica de forca - existencia transitoria,
 * consumida pelo port PasswordHasher (X1) e nunca persistida. O hash persistido e PasswordHash.
 *
 * Politica: comprimento em [8, 128]. SEM regra de composicao (NIST 800-63B: comprimento >
 * complexidade). NAO normaliza - senha preserva caixa e espacos byte-a-byte.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type Password = Brand<string, 'Password'>;

export type PasswordPolicyError = 'password-too-short' | 'password-too-long';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export const parse = (raw: string): Result<Password, PasswordPolicyError> => {
  if (raw.length < MIN_LENGTH) return err('password-too-short');
  if (raw.length > MAX_LENGTH) return err('password-too-long');
  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4): borda do sistema de tipos.
  // Sem normalizacao - a senha e preservada exatamente como digitada.
  return ok(raw as Password);
};
