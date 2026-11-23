import type { Clock } from '../ports/clock.ts';
import { utcCalendarDayOf } from './utc-calendar-day.ts';

/**
 * Relógio do sistema. `today()` lê `new Date()` sem argumento, que é sempre um `Date` válido (o
 * instante atual), então o `RangeError` de `utcCalendarDayOf` não é alcançável aqui.
 *
 * @returns O `Clock` em que `now()` devolve o instante atual e `today()` o dia UTC dele.
 */
export const ClockReal = (): Clock => ({
  now: () => new Date(),
  today: () => utcCalendarDayOf(new Date()),
});
