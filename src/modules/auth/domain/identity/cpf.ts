/**
 * Cpf - branded type + smart constructor do modulo auth.
 *
 * Module-as-namespace (Padrao D): consumir com `import * as Cpf from '...cpf.ts'`.
 *
 * Identidade cadastral: armazena SOMENTE digitos (11). A mascara de apresentacao
 * ("529.982.247-25") e responsabilidade da camada de apresentacao, nunca do dominio
 * (FR-008 da spec 005). Valida os digitos verificadores (defesa contra dados legados
 * mascarados/irregulares). Modulo isolado (ADR-0006): logica de CPF propria, nao importada.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type Cpf = Brand<string, 'Cpf'>;

export type CpfError = 'cpf-empty' | 'cpf-invalid-length' | 'cpf-invalid-checksum';

const CPF_LENGTH = 11;

const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

const allDigitsEqual = (digits: string): boolean => /^(\d)\1{10}$/.test(digits);

// Digito verificador modulo 11: soma dos digitos ponderados por fatores decrescentes
// a partir de `factorStart`; resto < 2 => 0, senao 11 - resto.
const checkDigit = (base: string, factorStart: number): string => {
  let sum = 0;
  let factor = factorStart;
  for (const ch of base) {
    sum += Number(ch) * factor;
    factor -= 1;
  }
  const rest = sum % 11;
  return String(rest < 2 ? 0 : 11 - rest);
};

export const parse = (raw: string): Result<Cpf, CpfError> => {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return err('cpf-empty');
  if (digits.length !== CPF_LENGTH) return err('cpf-invalid-length');
  // Sequencias repetidas (00000000000, 11111111111, ...) passam na formula mas sao invalidas.
  if (allDigitsEqual(digits)) return err('cpf-invalid-checksum');

  const base = digits.slice(0, 9);
  const dv1 = checkDigit(base, 10);
  const dv2 = checkDigit(base + dv1, 11);
  if (digits !== base + dv1 + dv2) return err('cpf-invalid-checksum');

  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4): borda do sistema de tipos.
  return ok(digits as Cpf);
};
