import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// VO MatchScore + score determinístico (D-MATCH). Função PURA: o score é insumo de decisão, NUNCA
// dispara conciliação (R1). Padrão module-as-namespace: `import * as MatchScore from './match-score.ts'`.

export type MatchScore = Brand<number, 'MatchScore'>;
export type MatchScoreError = 'score-out-of-range';
export type MatchBand = 'alta' | 'media' | 'baixa';

// Critérios ponderados (FR-011): alto = exactValue/payeeMatch/dateD0; médio = memoRef; baixo = supplierOpenCount.
export type MatchCriteria = Readonly<{
  payeeMatch: boolean;
  exactValue: boolean;
  dateD0: boolean;
  memoRef: boolean;
  supplierOpenCount: number;
}>;

// Dados crus p/ avaliar os critérios (a comparação é pura; a coleta dos dados é da application).
export type MatchInput = Readonly<{
  payeeName: string;
  supplierName: string | null;
  transactionValueCents: number;
  payableValueCents: number;
  transactionDate: Date;
  payableDueDate: Date;
  memo: string;
  documentNumber: string | null;
  supplierOpenCount: number;
}>;

const W_EXACT_VALUE = 40;
const W_PAYEE = 25;
const W_DATE_D0 = 20;
const W_MEMO_REF = 10;
const W_SUPPLIER_OPEN = 5;

const MIN = 0;
const MAX = 100;
const BAND_HIGH = 75;
const BAND_MID = 50;

export const fromValue = (raw: number): Result<MatchScore, MatchScoreError> =>
  Number.isInteger(raw) && raw >= MIN && raw <= MAX
    ? ok(raw as MatchScore)
    : err('score-out-of-range');

export const band = (score: MatchScore): MatchBand =>
  score >= BAND_HIGH ? 'alta' : score >= BAND_MID ? 'media' : 'baixa';

// Soma ponderada — 0..100 por construção (Σ pesos = 100), logo o cast é seguro (constructor do VO).
export const compute = (criteria: MatchCriteria): MatchScore => {
  const total =
    (criteria.exactValue ? W_EXACT_VALUE : 0) +
    (criteria.payeeMatch ? W_PAYEE : 0) +
    (criteria.dateD0 ? W_DATE_D0 : 0) +
    (criteria.memoRef ? W_MEMO_REF : 0) +
    (criteria.supplierOpenCount > 0 ? W_SUPPLIER_OPEN : 0);
  // Clamp blinda o cast (e futura mudança de pesos) ao domínio válido 0..100 do VO.
  const clamped = total > MAX ? MAX : total < MIN ? MIN : total;
  return clamped as MatchScore;
};

const normalizeName = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, ' ');

const sameDayUtc = (a: Date, b: Date): boolean =>
  a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Referência do memo casa por FRONTEIRA de palavra (\b) — evita falso-positivo de nº curto
// (ex.: doc '1' não casa dentro de '1000'). Compara em maiúsculas.
const memoMentions = (memo: string, ref: string): boolean =>
  ref.length > 0 && new RegExp(`\\b${escapeRegex(ref)}\\b`).test(memo.toUpperCase());

// Avalia os critérios a partir dos dados crus (transação × título candidato). Pura.
export const evaluateCriteria = (input: MatchInput): MatchCriteria => {
  const payee = normalizeName(input.payeeName);
  const supplier = input.supplierName === null ? '' : normalizeName(input.supplierName);
  const doc = input.documentNumber === null ? '' : input.documentNumber.trim().toUpperCase();
  return {
    payeeMatch: payee.length > 0 && payee === supplier,
    exactValue: input.transactionValueCents === input.payableValueCents,
    dateD0: sameDayUtc(input.transactionDate, input.payableDueDate),
    memoRef: memoMentions(input.memo, doc),
    supplierOpenCount: input.supplierOpenCount,
  };
};
