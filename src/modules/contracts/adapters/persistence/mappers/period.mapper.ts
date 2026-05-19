// Period mapper para MySQL (dialeto único — ADR-0020).
// MySQL `DATETIME(3)` em Drizzle (`mode: 'date'`) round-tripa `Date` direto.

import { type Result, err } from '../../../../../shared/result.ts';
import { Period, type PeriodError } from '../../../domain/shared/period.ts';

export type PeriodKindRaw = 'Fixed' | 'Indefinite';

export type PeriodColumns = Readonly<{
  kind: PeriodKindRaw;
  start: Date;
  end: Date | null;
}>;

export const periodToColumns = (p: Period): PeriodColumns => {
  switch (p.kind) {
    case 'Fixed':
      return { kind: 'Fixed', start: p.start, end: p.end };
    case 'Indefinite':
      return { kind: 'Indefinite', start: p.start, end: null };
    default: {
      const _exhaustive: never = p;
      return _exhaustive;
    }
  }
};

export type PeriodMapperError = PeriodError | 'period-mapper-fixed-missing-end';

export const periodFromColumns = (cols: PeriodColumns): Result<Period, PeriodMapperError> => {
  switch (cols.kind) {
    case 'Fixed': {
      if (cols.end === null) return err('period-mapper-fixed-missing-end');
      return Period.create(cols.start, cols.end);
    }
    case 'Indefinite':
      return Period.createIndefinite(cols.start);
    default: {
      const _exhaustive: never = cols.kind;
      return _exhaustive;
    }
  }
};
