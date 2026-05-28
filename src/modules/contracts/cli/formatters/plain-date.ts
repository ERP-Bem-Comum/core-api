import type { PlainDate } from '#src/shared/kernel/plain-date.ts';

/** Formata `PlainDate` em estilo BR (`DD/MM/YYYY`). */
export const formatPlainDate = (d: PlainDate): string => {
  const day = d.day.toString().padStart(2, '0');
  const month = d.month.toString().padStart(2, '0');
  return `${day}/${month}/${d.year.toString()}`;
};
