/**
 * Password - branded type + smart constructor (politica de forca) do modulo auth.
 *
 * Module-as-namespace (Padrao D): `import * as Password from '...password-policy.ts'`.
 *
 * `Password` e uma senha EM CLARO que passou na politica de forca - existencia transitoria,
 * consumida pelo port PasswordHasher (X1) e nunca persistida. O hash persistido e PasswordHash.
 *
 * Politica: comprimento em [12, 128] + blocklist de senhas vazadas/comuns (BE-REC-005,
 * NIST 800-63B 5.1.1.2: comprimento + lista de conhecidas > complexidade). SEM regra de
 * composicao. NAO normaliza - senha preserva caixa e espacos byte-a-byte.
 *
 * Minimo 12 (USR-PASSWORD-POLICY): OWASP Authentication Cheat Sheet 2025 recomenda >= 15 SEM MFA;
 * 12 e o compromisso UX x seguranca adotado enquanto o projeto nao tem MFA. `minLength`/`maxLength`
 * sao exportados para a borda HTTP expor a politica (GET /api/v2/auth/password-policy) sem duplicacao.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';
import { isCommon } from './password-blocklist.ts';

export type Password = Brand<string, 'Password'>;

export type PasswordPolicyError =
  | 'password-too-short'
  | 'password-too-long'
  | 'password-too-common';

export const minLength = 12;
export const maxLength = 128;

export const parse = (raw: string): Result<Password, PasswordPolicyError> => {
  if (raw.length < minLength) return err('password-too-short');
  if (raw.length > maxLength) return err('password-too-long');
  if (isCommon(raw)) return err('password-too-common');
  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4): borda do sistema de tipos.
  // Sem normalizacao - a senha e preservada exatamente como digitada.
  return ok(raw as Password);
};
