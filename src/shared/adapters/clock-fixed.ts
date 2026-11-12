import type { Clock } from '../ports/clock.ts';
import { utcCalendarDayOf } from './utc-calendar-day.ts';

/**
 * Relógio parado num instante. Valida o instante na construção: um `Date` inválido falha aqui,
 * no boot ou no setup do teste, e nunca dentro de um use case que chame `today()`.
 *
 * @param at - Instante fixo.
 * @returns O `Clock` em que `now()` devolve uma cópia do instante e `today()` o dia UTC dele, os
 * dois fixados na construção: mutar o `Date` do chamador ou o devolvido não os desalinha.
 * @throws {RangeError} Quando `at` é um `Date` inválido.
 */
export const ClockFixed = (at: Date): Clock => {
  const instant = at.getTime();
  const today = utcCalendarDayOf(new Date(instant));
  return {
    now: () => new Date(instant),
    today: () => today,
  };
};
