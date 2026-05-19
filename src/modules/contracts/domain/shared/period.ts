import { type Result, ok, err } from '../../../../shared/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import type { Brand } from '../../../../shared/brand.ts';

type PeriodShape =
  | Readonly<{ kind: 'Fixed'; start: Date; end: Date }>
  | Readonly<{ kind: 'Indefinite'; start: Date }>;

export type Period = Brand<PeriodShape, 'Period'>;

export type PeriodError =
  | 'period-invalid-start-date'
  | 'period-invalid-end-date'
  | 'period-end-before-start'
  | 'period-zero-duration'
  | 'period-year-out-of-range';

// Defeito #7: range mínimo de ano para proteger contra typos (`0001-01-01`).
// 2000 alinha com escopo prático do ERP (Bem Comum nasceu nos anos 2000+).
const MIN_YEAR = 2000;

const isYearInRange = (d: Date): boolean => d.getUTCFullYear() >= MIN_YEAR;

export const Period = {
  create: (start: Date, end: Date): Result<Period, PeriodError> => {
    if (!isValidDate(start)) return err('period-invalid-start-date');
    if (!isValidDate(end)) return err('period-invalid-end-date');
    if (!isYearInRange(start) || !isYearInRange(end)) return err('period-year-out-of-range');
    if (end.getTime() < start.getTime()) return err('period-end-before-start');
    // Defeito #7: período de 0 instantes (start === end) é noop conceitual.
    if (end.getTime() === start.getTime()) return err('period-zero-duration');
    return ok({ kind: 'Fixed', start, end } as Period);
  },

  createIndefinite: (start: Date): Result<Period, PeriodError> => {
    if (!isValidDate(start)) return err('period-invalid-start-date');
    if (!isYearInRange(start)) return err('period-year-out-of-range');
    return ok({ kind: 'Indefinite', start } as Period);
  },

  contains: (p: Period, instant: Date): boolean => {
    if (!isValidDate(instant)) return false;
    const t = instant.getTime();
    switch (p.kind) {
      case 'Fixed':
        return t >= p.start.getTime() && t <= p.end.getTime();
      case 'Indefinite':
        return t >= p.start.getTime();
    }
    // Exhaustive: TS verifica que `kind` é coberto em compile time.
  },

  equals: (a: Period, b: Period): boolean => {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'Fixed' && b.kind === 'Fixed') {
      return a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime();
    }
    if (a.kind === 'Indefinite' && b.kind === 'Indefinite') {
      return a.start.getTime() === b.start.getTime();
    }
    return false;
  },

  isIndefinite: (p: Period): boolean => p.kind === 'Indefinite',
};
