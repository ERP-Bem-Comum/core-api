/**
 * Formata `Money` em BRL legível (`R$ 150,50`).
 *
 * Pattern espelha `src/modules/contracts/cli/formatters/money.ts` — **lógica
 * funcionalmente idêntica** (cópia). Diffs:
 *   - Import via `#src/*` subpath em vez de relativo.
 *
 * `Intl.NumberFormat` é robusto contra magnitudes grandes — não cospe `1e+23`
 * nem perde precisão. `Money.fromCents` garante inteiro >= 0; divisão por 100
 * é segura.
 *
 * **CANDIDATO A EXTRAÇÃO** quando 3º módulo precisar — mover para
 * `src/shared/cli/formatters/money.ts`. Por enquanto: cópia local (YAGNI).
 */

import type { Money } from '#src/shared/kernel/money.ts';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Intl insere NBSP (U+00A0) entre "R$" e o valor — normalizamos para espaço
// regular (mais ergonômico em terminal e copy/paste). Escape `\u00A0` em vez do
// caractere literal (lint `no-irregular-whitespace`); runtime idêntico.
const NBSP_REGEX = /\u00A0/g;

export const formatMoney = (m: Money): string =>
  BRL_FORMATTER.format(m.cents / 100).replace(NBSP_REGEX, ' ');
