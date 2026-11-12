import type { Clock } from '#src/shared/ports/clock.ts';
import type { PlainDate as PlainDateType } from '#src/shared/kernel/plain-date.ts';
import { utcCalendarDayOf } from '#src/shared/adapters/utc-calendar-day.ts';

/** Formatador cujas partes numéricas `year`, `month` e `day` dão a data no fuso `America/Sao_Paulo`. */
const SAO_PAULO_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const numericPart = (
  parts: readonly Readonly<Intl.DateTimeFormatPart>[],
  type: 'year' | 'month' | 'day',
): number => Number(parts.find((p) => p.type === type)?.value);

const utcMidnightOf = (year: number, month: number, day: number): Date => {
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day);
  return utc;
};

/**
 * Extrai a data de calendário que o instante tem no fuso `America/Sao_Paulo`, não em UTC, com o
 * mesmo resultado qualquer que seja o fuso do processo. O ano sai sem reinterpretação: o ano 50
 * continua 50, não vira 1950.
 *
 * @param instant - Instante de origem.
 * @returns O `PlainDate` do dia em São Paulo: `2026-06-15T02:59:59Z` dá `2026-06-14` e
 * `2026-06-15T03:00:00Z` dá `2026-06-15`.
 * @throws {RangeError} Quando `instant` é um `Date` inválido.
 */
export const todayInSaoPauloAt = (instant: Date): PlainDateType => {
  const parts = SAO_PAULO_DATE_FORMAT.formatToParts(instant);
  return utcCalendarDayOf(
    utcMidnightOf(
      numericPart(parts, 'year'),
      numericPart(parts, 'month'),
      numericPart(parts, 'day'),
    ),
  );
};

/**
 * Relógio do job `contracts-sweeper` cujo `today` é a data de calendário em `America/Sao_Paulo`.
 *
 * @param readNow - Fonte do instante.
 * @returns O `Clock` em que `now()` devolve `readNow()` e `today()` devolve
 * `todayInSaoPauloAt(readNow())`.
 */
export const ClockSaoPaulo = (readNow: () => Date = () => new Date()): Clock => ({
  now: readNow,
  today: () => todayInSaoPauloAt(readNow()),
});
