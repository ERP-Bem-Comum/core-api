import { type Result, ok, err } from '../primitives/result.ts';
import { immutable } from '../primitives/immutable.ts';
import type { Brand } from '../primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as PlainDate from '#src/shared/kernel/plain-date.ts'`.
//
// Shared Kernel: VO de data-calendário (dia/mês/ano), SEM hora e SEM timezone —
// distinto de `Date` (instante). Base do Temporal API (inquiry 0020): o shape
// `{ year, month, day }` é um subconjunto estrutural de `Temporal.PlainDate`, e
// `compare` é função livre espelhando o `Temporal.PlainDate.compare` estático.
// No Node 26 Active LTS o backend interno vira `Temporal.PlainDate` sem alterar
// esta API pública.

export type PlainDate = Brand<Readonly<{ year: number; month: number; day: number }>, 'PlainDate'>;

export type PlainDateError =
  | 'plain-date-malformed'
  | 'plain-date-out-of-range'
  | 'plain-date-year-out-of-range';

// Alinhado a `Period` (period.ts:27): protege contra typos tipo `0001-01-01`.
const MIN_YEAR = 2000;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const from = (iso: string): Result<PlainDate, PlainDateError> => {
  const match = ISO_DATE.exec(iso);
  if (match === null) return err('plain-date-malformed');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_YEAR) return err('plain-date-year-out-of-range');

  // Round-trip UTC valida data-calendário real (rejeita 2026-02-30, 2026-13-01)
  // sem ambiguidade de timezone — `Date.UTC` normaliza overflow, o round-trip detecta.
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return err('plain-date-out-of-range');
  }

  return ok(immutable({ year, month, day }) as PlainDate);
};

/** Extrai os campos de calendário UTC de um instante. Usado por `Clock.today`. */
export const fromDate = (d: Date): PlainDate =>
  immutable({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }) as PlainDate;

/**
 * Data-calendário de um instante vista num fuso de **offset fixo** (em minutos).
 * Ex.: Brasília (UTC-3, sem DST desde 2019) → `offsetMinutes = -180`. Desloca o instante
 * pelo offset e extrai a data-calendário UTC resultante — i.e., a data local naquele fuso.
 */
export const fromDateAtOffsetMinutes = (d: Date, offsetMinutes: number): PlainDate =>
  fromDate(new Date(d.getTime() + offsetMinutes * 60_000));

/** Espelha `Temporal.PlainDate.compare` (estático): -1 antes, 0 igual, 1 depois. */
export const compare = (a: PlainDate, b: PlainDate): -1 | 0 | 1 => {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
};

export const isBefore = (a: PlainDate, b: PlainDate): boolean => compare(a, b) < 0;
export const isAfter = (a: PlainDate, b: PlainDate): boolean => compare(a, b) > 0;
export const equals = (a: PlainDate, b: PlainDate): boolean => compare(a, b) === 0;

export const toISOString = (d: PlainDate): string =>
  `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
