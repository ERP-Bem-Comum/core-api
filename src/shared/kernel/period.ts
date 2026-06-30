import { type Result, ok, err } from '../primitives/result.ts';
import { immutable } from '../primitives/immutable.ts';
import * as PlainDate from './plain-date.ts';
import type { Brand } from '../primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as Period from '#src/shared/kernel/period.ts'`.
//
// Shared Kernel (§3.H.4 DO H§36): VO genuinamente cross-BC — qualquer entidade
// com vigência temporal. `start`/`end` são `PlainDate` (data-calendário, sem
// hora/timezone), não `Date` — ver inquiry 0020. A validade da data e o range
// de ano são garantidos na construção do `PlainDate`; aqui só validamos ordem.

type PeriodShape =
  | Readonly<{ kind: 'Fixed'; start: PlainDate.PlainDate; end: PlainDate.PlainDate }>
  | Readonly<{ kind: 'Indefinite'; start: PlainDate.PlainDate }>;

export type Period = Brand<PeriodShape, 'Period'>;

export type PeriodError = 'period-end-before-start' | 'period-zero-duration';

export const create = (
  start: PlainDate.PlainDate,
  end: PlainDate.PlainDate,
): Result<Period, PeriodError> => {
  const cmp = PlainDate.compare(end, start);
  if (cmp < 0) return err('period-end-before-start');
  // Defeito #7: período de 0 dias (start === end) é noop conceitual.
  if (cmp === 0) return err('period-zero-duration');
  return ok(immutable({ kind: 'Fixed' as const, start, end }) as Period);
};

export const createIndefinite = (start: PlainDate.PlainDate): Period =>
  immutable({ kind: 'Indefinite' as const, start }) as Period;

/**
 * `contains` — testa se um INSTANTE (`Date`) cai na faixa de calendário do
 * período. O instante é projetado para sua data-calendário UTC antes da
 * comparação (faixa inclusiva nas duas pontas).
 */
export const contains = (p: Period, instant: Date): boolean => {
  if (Number.isNaN(instant.getTime())) return false;
  const d = PlainDate.fromDate(instant);
  switch (p.kind) {
    case 'Fixed':
      return PlainDate.compare(d, p.start) >= 0 && PlainDate.compare(d, p.end) <= 0;
    case 'Indefinite':
      return PlainDate.compare(d, p.start) >= 0;
  }
  // Exhaustive: TS verifica que `kind` é coberto em compile time.
};

export const equals = (a: Period, b: Period): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'Fixed' && b.kind === 'Fixed') {
    return PlainDate.equals(a.start, b.start) && PlainDate.equals(a.end, b.end);
  }
  if (a.kind === 'Indefinite' && b.kind === 'Indefinite') {
    return PlainDate.equals(a.start, b.start);
  }
  return false;
};

export const isIndefinite = (p: Period): boolean => p.kind === 'Indefinite';
