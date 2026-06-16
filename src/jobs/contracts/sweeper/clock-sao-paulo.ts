// Clock adapter para o job de auto-expire — cutoff do NEGÓCIO em America/Sao_Paulo.
//
// Por que não usar `ClockReal` (UTC)?
//   `ClockReal.today()` devolve o dia-calendário UTC (`getUTCFullYear/Month/Date`). No
//   fuso America/Sao_Paulo (UTC-3), à meia-noite de Brasília o UTC ainda marca o dia
//   anterior. Um contrato com fim = 2026-06-15 que deveria expirar na virada de
//   2026-06-15 00:00 BRT seria pulado até as 03:00 UTC — comportamento errado.
//
// Solução: `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'` extrai os campos
//   year/month/day no fuso do negócio do instante `Date.now()`. Nenhuma lib externa.
//   `now()` continua devolvendo `Date` (instante absoluto — sem timezone).
//
// Referência: ECMAScript Internationalization API (ECMA-402), disponível globalmente
//   em Node 24 (ICU full build — `node:v8.cachedData` inclui CLDR). `Intl.DateTimeFormat`
//   é Stable e não requer flag experimental. Citação da doc Node 24
//   `Globals.md` §"Intl": "Node.js has full-ICU enabled by default since v13.0.0."

import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import type { PlainDate as PlainDateType } from '#src/shared/kernel/plain-date.ts';

const TZ = 'America/Sao_Paulo';

/**
 * Extrai o dia-calendário do instante `d` no fuso `America/Sao_Paulo`.
 *
 * `Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' })`
 * formata o instante como `"YYYY-MM-DD"` — parse determinístico por índice de
 * `formatToParts`. Sem string split, sem dependência de locale do SO host.
 */
const todayInSaoPaulo = (): PlainDateType => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // `en-CA` produz "YYYY-MM-DD" — parse seguro por índice.
  const parts = fmt.formatToParts(new Date());
  let year = 0;
  let month = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value);
    else if (p.type === 'month') month = Number(p.value);
    else if (p.type === 'day') day = Number(p.value);
  }
  // Campos extraídos do ICU já são válidos — `fromParts` encapsula a construção do VO
  // (o cast `as PlainDate` vive no kernel, não aqui). Entrada não-confiável usaria `PlainDate.from`.
  return PlainDate.fromParts(year, month, day);
};

/**
 * Clock com cutoff de negócio em `America/Sao_Paulo`.
 *
 * `today()` → dia-calendário AGORA em BRT (cutoff do auto-expire D+1).
 * `now()`   → `Date` (instante absoluto, sem timezone — igual a `ClockReal`).
 *
 * Use em produção somente para o job `contracts-sweeper`. Testes unitários
 * do sweeper injetam um Clock stub com data fixa.
 */
export const ClockSaoPaulo = (): Clock => ({
  now: () => new Date(),
  today: todayInSaoPaulo,
});

// Exportação auxiliar para testes que queiram inspecionar a extração de partes.
export { todayInSaoPaulo as _todayInSaoPauloForTest };
