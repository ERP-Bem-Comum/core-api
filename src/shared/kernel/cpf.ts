import { type Result, ok, err } from '../primitives/result.ts';
import type { Brand } from '../primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as Cpf from '#src/shared/kernel/cpf.ts'`.
//
// Shared Kernel (§3.H.4 DO H§36): VO genuinamente cross-BC — CPF identifica
// colaborador (Parceiros), pode identificar usuário (Auth) e contraparte de
// pagamento (Financeiro). ADR-0031 §4 promove CPF/CNPJ/Email ao kernel.
//
// NÃO expõe `generate` — apenas `parse` para validar strings que cruzam a borda
// (o CPF vem de input externo, não é gerado aqui).

export type Cpf = Brand<string, 'Cpf'>;
export type CpfError = 'invalid-cpf';

const DV1_WEIGHTS: readonly number[] = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const DV2_WEIGHTS: readonly number[] = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

const moduleEleven = (sum: number): number => {
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

const checkDigit = (digits: string, weights: readonly number[]): number =>
  moduleEleven(weights.reduce((acc, weight, i) => acc + (digits.charCodeAt(i) - 48) * weight, 0));

const isValidCpf = (digits: string): boolean => {
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (checkDigit(digits, DV1_WEIGHTS) !== Number(digits[9])) return false;
  if (checkDigit(digits, DV2_WEIGHTS) !== Number(digits[10])) return false;
  return true;
};

/**
 * `parse` valida e normaliza um CPF. Aceita máscara (`000.000.000-00`) ou bare;
 * o valor brandado é sempre os 11 dígitos sem máscara. Rejeita comprimento != 11,
 * sequência de dígito repetido e DV módulo 11 incorreto.
 */
export const parse = (raw: string): Result<Cpf, CpfError> => {
  const digits = onlyDigits(raw);
  return isValidCpf(digits) ? ok(digits as Cpf) : err('invalid-cpf');
};
