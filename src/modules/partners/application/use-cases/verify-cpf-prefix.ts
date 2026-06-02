/**
 * `verifyCpfPrefix` — verificação leve de identidade do fluxo público de auto-cadastro:
 * confere os 3 primeiros dígitos do CPF informados contra o CPF cadastrado (legado
 * `check-first-three-numbers-cpf`). Puro, sem IO.
 *
 * Aceita máscara no prefixo (normaliza para dígitos). Exige exatamente 3 dígitos.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';

export type CpfPrefixError = 'cpf-prefix-invalid' | 'cpf-prefix-mismatch';

const PREFIX_LENGTH = 3;

export const verifyCpfPrefix = (cpf: Cpf, prefixRaw: string): Result<true, CpfPrefixError> => {
  const digits = prefixRaw.replace(/\D/g, '');
  if (digits.length !== PREFIX_LENGTH) return err('cpf-prefix-invalid');
  return String(cpf).slice(0, PREFIX_LENGTH) === digits ? ok(true) : err('cpf-prefix-mismatch');
};
