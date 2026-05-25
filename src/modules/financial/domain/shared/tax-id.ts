/**
 * TaxId — identificador fiscal brasileiro (CPF | CNPJ alfanumérico).
 *
 * Discriminated union de duas variantes:
 *
 *   - **CPF** — 11 dígitos numéricos com 2 dígitos verificadores (DV)
 *     calculados via módulo 11.
 *   - **CNPJ** — versão alfanumérica da Receita Federal (2026): 12 caracteres
 *     alfanuméricos `[0-9A-Z]` + 2 DVs numéricos.
 *
 * **Fonte normativa (transcrita literalmente em
 * `.claude/.pipeline/FIN-VO-TAX-ID/000-request.md` §3):**
 *
 *   - §3.1 — Algoritmo de validação do CPF (Receita Federal). Exemplo:
 *     `111.444.777-35` (DV1=3, DV2=5).
 *   - §3.2 — Cálculo dos dígitos verificadores de CNPJ alfanumérico
 *     (Serpro). Exemplo: `12.ABC.345/01DE-35` (DV1=3, DV2=5).
 *
 * **Tabela ASCII → valor (CNPJ alfanumérico):**
 *   valor = `char.charCodeAt(0) - 48`
 *
 *   `'0'`=0 ... `'9'`=9; `'A'`=17, `'B'`=18, ... `'Z'`=42.
 *
 * **Pesos do módulo 11:**
 *
 *   CPF DV1: [10, 9, 8, 7, 6, 5, 4, 3, 2]
 *   CPF DV2: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
 *
 *   CNPJ DV1: [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]   (recomeço de 9 após oitavo char)
 *   CNPJ DV2: [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
 *
 * **Regra final do DV (ambos):**
 *   se `soma % 11 < 2` → DV = 0
 *   senão              → DV = 11 - (soma % 11)
 *
 * Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
 * Consumir com `import * as TaxId from './tax-id.ts'`.
 */

import type { Brand } from '#src/shared/primitives/brand.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// ─── Types ──────────────────────────────────────────────────────────────

export type CPF = Brand<{ readonly kind: 'CPF'; readonly digits: string }, 'CPF'>;
export type CNPJ = Brand<{ readonly kind: 'CNPJ'; readonly chars: string }, 'CNPJ'>;
export type TaxId = CPF | CNPJ;

export type TaxIdError =
  | 'tax-id-empty'
  | 'tax-id-invalid-length'
  | 'tax-id-invalid-charset'
  | 'cpf-check-digit-mismatch'
  | 'cnpj-check-digit-mismatch';

// ─── Internal helpers (não exportados) ──────────────────────────────────

// Forma canônica: CPF tem 11 dígitos, CNPJ tem 14 chars (12 alfanuméricos + 2 dígitos DV).
const CPF_BODY_REGEX = /^\d{11}$/;
// DVs do CNPJ são SEMPRE numéricos — corpo aceita alfanumérico, DVs só dígitos.
const CNPJ_BODY_REGEX = /^[0-9A-Z]{12}\d{2}$/;
const CPF_WEIGHTS_DV1: readonly number[] = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_WEIGHTS_DV2: readonly number[] = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_DV1: readonly number[] = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_DV2: readonly number[] = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

// Normaliza input: remove tudo que não é alfanumérico, UPPERCASE.
// Adapter de UI/CLI pode passar máscara, lowercase, etc.
const normalize = (raw: string): string => raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

// CPFs/CNPJs com todos os caracteres iguais (`'00000000000'`, `'11111111111'`,
// `'AAAAAAAAAAAAAA'`) passam aritmeticamente o módulo 11 mas são reservados
// pela RFB — rejeitamos como invalid DV para evitar entrada acidental.
const allSame = (s: string): boolean => /^(.)\1+$/.test(s);

// Aplica regra final do módulo 11: soma → resto → DV.
const moduleEleven = (sum: number): number => {
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

// `reduce` itera apenas elementos definidos — `weight` tem tipo `number` (não
// `number | undefined`), evitando casts. `digits.charCodeAt(i) - 48` extrai o
// valor numérico do char na posição `i` sem indexed access do string (que sob
// `noUncheckedIndexedAccess` retornaria `string | undefined`).

const calculateCpfDV1 = (digits: string): number => {
  const sum = CPF_WEIGHTS_DV1.reduce(
    (acc, weight, i) => acc + (digits.charCodeAt(i) - 48) * weight,
    0,
  );
  return moduleEleven(sum);
};

const calculateCpfDV2 = (digits: string): number => {
  const sum = CPF_WEIGHTS_DV2.reduce(
    (acc, weight, i) => acc + (digits.charCodeAt(i) - 48) * weight,
    0,
  );
  return moduleEleven(sum);
};

const calculateCnpjDV1 = (chars: string): number => {
  const sum = CNPJ_WEIGHTS_DV1.reduce(
    (acc, weight, i) => acc + (chars.charCodeAt(i) - 48) * weight,
    0,
  );
  return moduleEleven(sum);
};

const calculateCnpjDV2 = (chars: string): number => {
  const sum = CNPJ_WEIGHTS_DV2.reduce(
    (acc, weight, i) => acc + (chars.charCodeAt(i) - 48) * weight,
    0,
  );
  return moduleEleven(sum);
};

// ─── Smart constructors ─────────────────────────────────────────────────

export const fromCpf = (raw: string): Result<CPF, TaxIdError> => {
  const normalized = normalize(raw);
  if (normalized.length === 0) return err('tax-id-empty');
  if (normalized.length !== 11) return err('tax-id-invalid-length');
  if (!CPF_BODY_REGEX.test(normalized)) return err('tax-id-invalid-charset');
  if (allSame(normalized)) return err('cpf-check-digit-mismatch');

  const expectedDV1 = calculateCpfDV1(normalized);
  const expectedDV2 = calculateCpfDV2(normalized);
  const actualDV1 = Number(normalized[9]);
  const actualDV2 = Number(normalized[10]);
  if (expectedDV1 !== actualDV1 || expectedDV2 !== actualDV2) {
    return err('cpf-check-digit-mismatch');
  }

  return ok(immutable({ kind: 'CPF' as const, digits: normalized }) as CPF);
};

export const fromCnpj = (raw: string): Result<CNPJ, TaxIdError> => {
  const normalized = normalize(raw);
  if (normalized.length === 0) return err('tax-id-empty');
  if (normalized.length !== 14) return err('tax-id-invalid-length');
  if (!CNPJ_BODY_REGEX.test(normalized)) return err('tax-id-invalid-charset');
  if (allSame(normalized)) return err('cnpj-check-digit-mismatch');

  const expectedDV1 = calculateCnpjDV1(normalized);
  const expectedDV2 = calculateCnpjDV2(normalized);
  const actualDV1 = Number(normalized[12]);
  const actualDV2 = Number(normalized[13]);
  if (expectedDV1 !== actualDV1 || expectedDV2 !== actualDV2) {
    return err('cnpj-check-digit-mismatch');
  }

  return ok(immutable({ kind: 'CNPJ' as const, chars: normalized }) as CNPJ);
};

// Despacha por comprimento APÓS normalização — aceita máscara (`111.444.777-35`)
// e bare (`11144477735`) uniformemente.
export const fromString = (raw: string): Result<TaxId, TaxIdError> => {
  const normalized = normalize(raw);
  if (normalized.length === 0) return err('tax-id-empty');
  if (normalized.length === 11) return fromCpf(normalized);
  if (normalized.length === 14) return fromCnpj(normalized);
  return err('tax-id-invalid-length');
};

// ─── Formatação (display humano — NÃO usar em CNAB) ────────────────────

export const format = (id: TaxId): string => {
  switch (id.kind) {
    case 'CPF': {
      const d = id.digits;
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
    }
    case 'CNPJ': {
      const c = id.chars;
      return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
};

// ─── Equality field-by-field ───────────────────────────────────────────

export const equals = (a: TaxId, b: TaxId): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'CPF' && b.kind === 'CPF') return a.digits === b.digits;
  if (a.kind === 'CNPJ' && b.kind === 'CNPJ') return a.chars === b.chars;
  return false;
};
