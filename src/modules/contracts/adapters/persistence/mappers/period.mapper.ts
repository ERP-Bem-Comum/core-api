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

// ─── Tagged error variants (Padrão D — DO D§22) ──────────────────────────────
//
// Dois erros próprios do mapper, ambos de estado corrompido no DB:
//   - `PeriodMapperFixedMissingEnd`: row com kind='Fixed' e `end` null;
//   - `PeriodMapperInvalidDate`: coluna `start`/`end` que o driver devolveu como `Date` inválido.
// `PeriodMapperError` é union heterogênea de 3 membros: PeriodError (string literal — VO puro)
// | os dois tagged records do mapper. Pragmatismo aceito: migração do VO string literal para
// tagged é escopo de ticket dedicado (Bloco B). Para distinguir: `typeof e === 'string'` separa o
// erro do VO, e `e.tag` separa os dois do mapper.

export type PeriodMapperFixedMissingEnd = Readonly<{
  tag: 'PeriodMapperFixedMissingEnd';
}>;

export const periodMapperFixedMissingEnd = (): PeriodMapperFixedMissingEnd => ({
  tag: 'PeriodMapperFixedMissingEnd',
});

// Coluna de data que o banco devolveu como `Date` inválido (ex.: data zerada no mysql2).
// `reason` repete o erro do kernel para a causa-raiz ser filtrável pelo mesmo nome em todo mapper.
export type PeriodMapperInvalidDate = Readonly<{
  tag: 'PeriodMapperInvalidDate';
  column: 'start' | 'end';
  reason: PlainDate.PlainDateFromDateError;
}>;

export const periodMapperInvalidDate = (
  column: PeriodMapperInvalidDate['column'],
  reason: PlainDate.PlainDateFromDateError,
): PeriodMapperInvalidDate => ({ tag: 'PeriodMapperInvalidDate', column, reason });

export type PeriodMapperError = PeriodError | PeriodMapperInvalidDate | PeriodMapperFixedMissingEnd;

export const periodFromColumns = (
  cols: PeriodColumns,
): Result<Period.Period, PeriodMapperError> => {
  const start = PlainDate.fromDate(cols.start);
  if (!start.ok) return err(periodMapperInvalidDate('start', start.error));
  switch (cols.kind) {
    case 'Fixed': {
      if (cols.end === null) return err(periodMapperFixedMissingEnd());
      const end = PlainDate.fromDate(cols.end);
      if (!end.ok) return err(periodMapperInvalidDate('end', end.error));
      return Period.create(start.value, end.value);
    }
    case 'Indefinite':
      return ok(Period.createIndefinite(start.value));
    default: {
      const _exhaustive: never = cols.kind;
      return _exhaustive;
    }
  }
};
