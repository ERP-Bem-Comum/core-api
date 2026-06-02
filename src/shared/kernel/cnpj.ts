/**
 * CNPJ numérico (14 dígitos) — módulo 11.
 *
 * Função pura, sem IO. `isValidCnpj` é usado pelo import de contratos legados
 * (UC-11): o CNPJ é validado e DESCARTADO (decisão D2 — o agregado Contract não
 * modela fornecedor). O VO `Cnpj` (Padrão D) é a fonte cross-BC promovida ao
 * kernel por ADR-0031 §4 — consumir com `import * as Cnpj from '...cnpj.ts'`.
 *
 * Escopo: CNPJ numérico tradicional (legado). O CNPJ alfanumérico Serpro/2026
 * vive no VO `financial/domain/shared/tax-id.ts` e NÃO é importável aqui
 * (isolamento de módulos, ADR-0006) — por isso o algoritmo é replicado aqui.
 *
 * Pesos do módulo 11 e regra final do DV: idênticos ao tax-id (Receita Federal).
 */
import { type Result, ok, err } from '../primitives/result.ts';
import type { Brand } from '../primitives/brand.ts';

export type Cnpj = Brand<string, 'Cnpj'>;
export type CnpjError = 'invalid-cnpj';

const DV1_WEIGHTS: readonly number[] = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const DV2_WEIGHTS: readonly number[] = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

const moduleEleven = (sum: number): number => {
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

const checkDigit = (digits: string, weights: readonly number[]): number =>
  moduleEleven(weights.reduce((acc, weight, i) => acc + (digits.charCodeAt(i) - 48) * weight, 0));

/**
 * `true` se `raw` é um CNPJ numérico válido (14 dígitos + 2 DVs módulo 11).
 * Aceita máscara (`00.000.000/0000-00`) ou bare (`00000000000000`).
 * Rejeita comprimento != 14 e sequências de dígito repetido (`111...`).
 */
export const isValidCnpj = (raw: string): boolean => {
  const digits = onlyDigits(raw);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (checkDigit(digits, DV1_WEIGHTS) !== Number(digits[12])) return false;
  if (checkDigit(digits, DV2_WEIGHTS) !== Number(digits[13])) return false;
  return true;
};

/**
 * `parse` valida e normaliza um CNPJ. Aceita máscara (`00.000.000/0000-00`) ou
 * bare; o valor brandado é sempre os 14 dígitos sem máscara. Reusa `isValidCnpj`.
 */
export const parse = (raw: string): Result<Cnpj, CnpjError> =>
  isValidCnpj(raw) ? ok(onlyDigits(raw) as Cnpj) : err('invalid-cnpj');
