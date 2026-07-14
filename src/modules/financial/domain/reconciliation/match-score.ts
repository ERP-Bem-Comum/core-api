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
  paidAt: Date | null;
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

// Breakdown dos critérios (#140): expõe peso + resultado por critério p/ a UI renderizar os chips
// (ok|parcial|falha) sem heurística própria. Read-only — NÃO altera R1 (nunca concilia). Pura.
export type CriterionKey = 'exactValue' | 'payeeMatch' | 'dateD0' | 'memoRef' | 'supplierOpen';
export type CriterionOutcome = 'ok' | 'parcial' | 'falha';
export type CriterionResult = Readonly<{
  criterion: CriterionKey;
  weight: number;
  result: CriterionOutcome;
  detail: string;
}>;

const boolOutcome = (passed: boolean): CriterionOutcome => (passed ? 'ok' : 'falha');

// supplierOpenCount é sinal fraco: exatamente 1 título aberto = `ok`; vários = `parcial` (ambíguo); 0 = `falha`.
const supplierOutcome = (count: number): CriterionOutcome =>
  count === 0 ? 'falha' : count === 1 ? 'ok' : 'parcial';

export const criteriaBreakdown = (criteria: MatchCriteria): readonly CriterionResult[] => [
  {
    criterion: 'exactValue',
    weight: W_EXACT_VALUE,
    result: boolOutcome(criteria.exactValue),
    detail: '',
  },
  {
    criterion: 'payeeMatch',
    weight: W_PAYEE,
    result: boolOutcome(criteria.payeeMatch),
    detail: '',
  },
  { criterion: 'dateD0', weight: W_DATE_D0, result: boolOutcome(criteria.dateD0), detail: '' },
  { criterion: 'memoRef', weight: W_MEMO_REF, result: boolOutcome(criteria.memoRef), detail: '' },
  {
    criterion: 'supplierOpen',
    weight: W_SUPPLIER_OPEN,
    result: supplierOutcome(criteria.supplierOpenCount),
    detail: String(criteria.supplierOpenCount),
  },
];

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Referência do memo casa por FRONTEIRA de palavra (\b) — evita falso-positivo de nº curto
// (ex.: doc '1' não casa dentro de '1000'). Compara em maiúsculas.
const memoMentions = (memo: string, ref: string): boolean =>
  ref.length > 0 && new RegExp(`\\b${escapeRegex(ref)}\\b`).test(memo.toUpperCase());

// Sufixos societários (só ruído p/ o match). Os de 2 chars (ME/SA/EI) já caem pelo filtro de tamanho.
const NAME_STOPWORDS: ReadonlySet<string> = new Set(['LTDA', 'EIRELI', 'EPP', 'MEI', 'CIA']);

// Tokens significativos de um nome: sem acento, caixa alta, só alfanumérico, ≥3 chars, sem sufixo societário.
const nameTokens = (value: string): readonly string[] =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));

// payeeMatch TOLERANTE (multi-banco): ≥60% dos tokens do fornecedor presentes no payee do extrato.
// Ex.: "TED 33994 FULANO LTDA" (extrato) casa com "Fulano Ltda" (cadastro). Anti-ruído: exige a MAIORIA
// dos tokens do fornecedor (não um só genérico) → não casa por um sobrenome comum isolado.
const PAYEE_MATCH_MIN_RATIO = 0.6;
const payeeMatches = (payeeName: string, supplierName: string): boolean => {
  const supplier = nameTokens(supplierName);
  if (supplier.length === 0) return false;
  const payee = new Set(nameTokens(payeeName));
  const hits = supplier.filter((t) => payee.has(t)).length;
  return hits / supplier.length >= PAYEE_MATCH_MIN_RATIO;
};

// Data TOLERANTE: o débito bancário casa com a BAIXA do título, não com o vencimento — aceita ±N dias
// em torno da data-âncora (paidAt quando existe; ver evaluateCriteria). Comparação por número do dia em
// UTC (imune a fuso). Mantém o sinal como corroboração (não é o âncora do match).
const DATE_TOLERANCE_DAYS = 5;
const MS_PER_DAY = 86_400_000;
const utcDayNumber = (d: Date): number =>
  Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_PER_DAY);
// Exportada para reuso no casamento de contrapartida (#269/US2): mesma janela ±5d, evita duplicar a constante.
export const dateWithinTolerance = (a: Date, b: Date): boolean =>
  Math.abs(utcDayNumber(a) - utcDayNumber(b)) <= DATE_TOLERANCE_DAYS;

// Avalia os critérios a partir dos dados crus (transação × título candidato). Pura.
// `payeeMatch` e `dateD0` são TOLERANTES (extrato real de bancos diferentes: descrição livre + data ≠ D0);
// a precisão vem da CORROBORAÇÃO — `exactValue` (40) sozinho segue < 50 (banda baixa, filtrado); só ativa
// com um 2º sinal (payee/data/memo). Ver #272.
// `dateD0` ancora na DATA DE PAGAMENTO (`paidAt`) quando registrada — o débito do extrato casa com a baixa,
// não com o vencimento; sem baixa, cai no `payableDueDate` como rede (mesma tolerância ±5d). Ver #272 ponto 2.
export const evaluateCriteria = (input: MatchInput): MatchCriteria => {
  const doc = input.documentNumber === null ? '' : input.documentNumber.trim().toUpperCase();
  return {
    payeeMatch: input.supplierName !== null && payeeMatches(input.payeeName, input.supplierName),
    exactValue: input.transactionValueCents === input.payableValueCents,
    dateD0: dateWithinTolerance(input.transactionDate, input.paidAt ?? input.payableDueDate),
    memoRef: memoMentions(input.memo, doc),
    supplierOpenCount: input.supplierOpenCount,
  };
};
