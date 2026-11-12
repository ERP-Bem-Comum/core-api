import * as PlainDate from '../kernel/plain-date.ts';

/**
 * Data de calendário UTC de um instante, para relógio que precisa devolver `PlainDate` sem `Result`.
 *
 * @param instant - Instante de origem.
 * @returns O `PlainDate` do dia UTC de `instant`.
 * @throws {RangeError} Quando `instant` é um `Date` inválido.
 */
export const utcCalendarDayOf = (instant: Date): PlainDate.PlainDate => {
  const day = PlainDate.fromDate(instant);
  if (!day.ok) throw new RangeError('Relógio recebeu um Date inválido: não há data de calendário.');
  return day.value;
};
