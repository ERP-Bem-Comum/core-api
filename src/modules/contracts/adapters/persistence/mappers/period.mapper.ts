// Period mapper para MySQL (dialeto único — ADR-0020).
// MySQL `DATETIME(3)` em Drizzle (`mode: 'date'`) round-tripa `Date` direto.

import { type Result, err } from '../../../../../shared/primitives/result.ts';
import * as Period from '#src/shared/kernel/period.ts';
import type { PeriodError } from '#src/shared/kernel/period.ts';

export type PeriodKindRaw = 'Fixed' | 'Indefinite';

export type PeriodColumns = Readonly<{
  kind: PeriodKindRaw;
  start: Date;
  end: Date | null;
}>;

export const periodToColumns = (p: Period.Period): PeriodColumns => {
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

// ─── Tagged error variant (Padrão D — DO D§22) ───────────────────────────────
//
// `PeriodMapperFixedMissingEnd` é o único erro próprio do mapper — ocorre quando
// uma row com kind='Fixed' tem `end` null no DB (estado corrompido).
// `PeriodMapperError` é union heterogênea: PeriodError (string literal — VO puro)
// | PeriodMapperFixedMissingEnd (tagged record — mapper). Pragmatismo aceito:
// migração do VO string literal para tagged é escopo de ticket dedicado (Bloco B).
// Consumidores que precisam distinguir os dois ramos: `typeof e === 'string'`.

export type PeriodMapperFixedMissingEnd = Readonly<{
  tag: 'PeriodMapperFixedMissingEnd';
}>;

export const periodMapperFixedMissingEnd = (): PeriodMapperFixedMissingEnd => ({
  tag: 'PeriodMapperFixedMissingEnd',
});

export type PeriodMapperError = PeriodError | PeriodMapperFixedMissingEnd;

export const periodFromColumns = (
  cols: PeriodColumns,
): Result<Period.Period, PeriodMapperError> => {
  switch (cols.kind) {
    case 'Fixed': {
      if (cols.end === null) return err(periodMapperFixedMissingEnd());
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
