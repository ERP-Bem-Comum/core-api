/**
 * CNPJ — módulo 11, formato alfanumérico Serpro/Receita 2026 (ADR-0044).
 *
 * Função pura, sem IO. `isValidCnpj` é usado pelo import de contratos legados
 * (UC-11): o CNPJ é validado e DESCARTADO (decisão D2 — o agregado Contract não
 * modela fornecedor). O VO `Cnpj` (Padrão D) é a fonte cross-BC promovida ao
 * kernel por ADR-0031 §4 — consumir com `import * as Cnpj from '...cnpj.ts'`.
 *
 * As 12 primeiras posições (raiz + estabelecimento) aceitam `[0-9A-Z]`; os 2 DVs
 * são sempre numéricos. O checksum é o mesmo módulo 11 com os mesmos pesos,
 * trocando só a conversão do caractere: `valor(c) = ASCII(c) − 48`
 * (`'0'..'9' → 0..9`, `'A'..'Z' → 17..42`). É retrocompatível: um CNPJ 100%
 * numérico valida idêntico ao legado.
 */
import { type Result, ok, err } from '../primitives/result.ts';
import type { Brand } from '../primitives/brand.ts';

export type Cnpj = Brand<string, 'Cnpj'>;
export type CnpjError = 'invalid-cnpj';

const DV1_WEIGHTS: readonly number[] = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const DV2_WEIGHTS: readonly number[] = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

// 12 posições alfanuméricas + 2 DVs numéricos (sempre uppercase pós-normalização).
const CNPJ_SHAPE = /^[0-9A-Z]{12}[0-9]{2}$/;

/** Remove máscara (`.` `/` `-` espaços) e aplica uppercase, mantendo `A-Z`. */
const normalize = (raw: string): string => raw.replace(/[.\-/\s]/g, '').toUpperCase();

const moduleEleven = (sum: number): number => {
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

// valor(c) = ASCII(c) − 48 (NT Serpro/Receita) — idêntico ao numérico para dígitos.
const checkDigit = (chars: string, weights: readonly number[]): number =>
  moduleEleven(weights.reduce((acc, weight, i) => acc + (chars.charCodeAt(i) - 48) * weight, 0));

/**
 * `true` se `raw` é um CNPJ válido (12 alfanuméricos + 2 DVs numéricos, módulo 11).
 * Aceita máscara (`00.000.000/0000-00`) ou bare, maiúsculas ou minúsculas.
 * Rejeita comprimento != 14, formato fora de `[0-9A-Z]{12}[0-9]{2}` e os 14
 * caracteres idênticos (`000...`, degenerado).
 */
export const isValidCnpj = (raw: string): boolean => {
  const value = normalize(raw);
  if (value.length !== 14) return false;
  if (!CNPJ_SHAPE.test(value)) return false;
  if (/^(.)\1{13}$/.test(value)) return false;
  if (checkDigit(value, DV1_WEIGHTS) !== Number(value[12])) return false;
  if (checkDigit(value, DV2_WEIGHTS) !== Number(value[13])) return false;
  return true;
};

/**
 * `parse` valida e normaliza um CNPJ. Aceita máscara ou bare, em qualquer caixa;
 * o valor brandado é sempre os 14 caracteres uppercase sem máscara. Reusa `isValidCnpj`.
 */
export const parse = (raw: string): Result<Cnpj, CnpjError> =>
  isValidCnpj(raw) ? ok(normalize(raw) as Cnpj) : err('invalid-cnpj');
