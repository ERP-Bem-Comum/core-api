import type { Clock } from '../ports/clock.ts';
import { utcCalendarDayOf } from './utc-calendar-day.ts';

/**
 * Relógio parado num instante. Valida o instante na construção: um `Date` inválido falha aqui,
 * no boot ou no setup do teste, e nunca dentro de um use case que chame `today()`.
 *
 * @param at - Instante fixo.
 * @returns O `Clock` em que `now()` devolve `at` e `today()` devolve o dia UTC de `at`, calculado
 * uma vez na construção.
 * @throws {RangeError} Quando `at` é um `Date` inválido.
 */
export const ClockFixed = (at: Date): Clock => {
  const today = utcCalendarDayOf(at);
  return {
    now: () => at,
    today: () => today,
  };
};
