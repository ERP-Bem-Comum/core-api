import type { Money } from '#src/shared/kernel/money.ts';

// Defeito #10: Intl.NumberFormat é robusto contra magnitudes grandes
// (não cospe `1e+23` nem perde precisão de milhares).
// `Money.fromCents` já garante inteiro >= 0 <= MAX_SAFE_INTEGER, então divisão
// por 100 é segura — sem risco de arredondamento.
const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Intl insere NBSP (U+00A0) entre "R$" e o valor numérico. Normalizamos
// para espaço regular — mais ergonômico no terminal e em copy/paste.
const NBSP_REGEX = /\u00A0/g;

export const formatMoney = (m: Money): string =>
  BRL_FORMATTER.format(m.cents / 100).replace(NBSP_REGEX, ' ');
