// Period mapper para MySQL (dialeto único — ADR-0020).
// As colunas continuam `DATETIME(3)` (`mode: 'date'` → `Date`); o domínio usa
// `PlainDate` (data-calendário). A conversão acontece AQUI, na borda: PlainDate
// → `Date` à meia-noite UTC; `Date` → `PlainDate.fromDate`. Ver inquiry 0020
// (migração da coluna para `date` é Fase 2b).

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import * as Period from '#src/shared/kernel/period.ts';
import type { PeriodError } from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

export type PeriodKindRaw = 'Fixed' | 'Indefinite';

export type PeriodColumns = Readonly<{
  kind: PeriodKindRaw;
  start: Date;
  end: Date | null;
}>;

const toUTCDate = (d: PlainDate.PlainDate): Date => new Date(Date.UTC(d.year, d.month - 1, d.day));

export const periodToColumns = (p: Period.Period): PeriodColumns => {
  switch (p.kind) {
    case 'Fixed':
      return { kind: 'Fixed', start: toUTCDate(p.start), end: toUTCDate(p.end) };
    case 'Indefinite':
      return { kind: 'Indefinite', start: toUTCDate(p.start), end: null };
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
      return Period.create(PlainDate.fromDate(cols.start), PlainDate.fromDate(cols.end));
    }
    case 'Indefinite':
      return ok(Period.createIndefinite(PlainDate.fromDate(cols.start)));
    default: {
      const _exhaustive: never = cols.kind;
      return _exhaustive;
    }
  }
};
