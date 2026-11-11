import { type Result, ok, err } from '../primitives/result.ts';
import { immutable } from '../primitives/immutable.ts';
import type { Brand } from '../primitives/brand.ts';

/**
 * Data de calendário (ano, mês, dia), sem hora e sem fuso: o valor tem apenas as chaves `year`,
 * `month` e `day`, somente-leitura no tipo e congeladas em runtime. Carrega a marca nominal
 * `'PlainDate'`, então um objeto literal `{ year, month, day }` sem marca não é atribuível a ele.
 */
export type PlainDate = Brand<
  Readonly<{
    /** Ano. */
    year: number;
    /** Mês, com janeiro valendo 1. */
    month: number;
    /** Dia do mês. */
    day: number;
  }>,
  'PlainDate'
>;

/**
 * Motivos de recusa de {@link from}: `'plain-date-malformed'` quando a string não é exatamente
 * `YYYY-MM-DD`; `'plain-date-year-out-of-range'` quando o ano é anterior a {@link MIN_YEAR}, mesmo
 * que mês ou dia também não existam; `'plain-date-out-of-range'` quando o ano é aceito e mês ou
 * dia não existem no calendário.
 */
export type PlainDateError =
  | 'plain-date-malformed'
  | 'plain-date-out-of-range'
  | 'plain-date-year-out-of-range';

/** Menor ano aceito por {@link from}: `0001-01-01` e `1999-12-31` são recusados. */
const MIN_YEAR = 2000;

/** Exatamente quatro dígitos ASCII de ano, hífen, dois de mês, hífen, dois de dia. */
const ISO_DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

const existsInCalendar = (year: number, month: number, day: number): boolean => {
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
};

/**
 * Converte uma string `YYYY-MM-DD` num {@link PlainDate} congelado, com `year`, `month` e `day`
 * numéricos. O ano é checado antes do calendário.
 *
 * @param iso - Data no formato `YYYY-MM-DD`, com ano de quatro dígitos e mês e dia de dois.
 * @returns `ok` com o `PlainDate` quando a data é válida, de `2000-01-01` a `9999-12-31`;
 * `err('plain-date-malformed')` quando a string não é exatamente `YYYY-MM-DD` (outro separador,
 * falta de zero à esquerda, hora, espaço, quebra de linha, sinal, ano de cinco dígitos ou dígitos
 * não-ASCII); `err('plain-date-year-out-of-range')` quando o ano é anterior a 2000;
 * `err('plain-date-out-of-range')` quando mês ou dia não existem no calendário, como `2026-02-30`,
 * `2026-13-01` ou `2026-02-29`.
 * @example
 * ```ts
 * assert.deepEqual(PlainDate.from('2026-05-26'), ok(PlainDate.fromDate(new Date('2026-05-26T00:00:00Z'))));
 * ```
 */
export const from = (iso: string): Result<PlainDate, PlainDateError> => {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (match === null) return err('plain-date-malformed');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_YEAR) return err('plain-date-year-out-of-range');
  if (!existsInCalendar(year, month, day)) return err('plain-date-out-of-range');

  return ok(immutable({ year, month, day }) as PlainDate);
};

/**
 * Extrai a data de calendário UTC de um instante, ignorando o fuso em que ele foi escrito e
 * convertendo o mês de base zero do `Date` para 1 a 12. Não aplica o limite de ano 2000. É o que
 * `ClockFixed.today` e `ClockReal.today` devolvem.
 *
 * @param d - Instante de origem.
 * @returns O `PlainDate` do dia UTC de `d`, congelado; com `Date` inválido, `year`, `month` e
 * `day` são `NaN`.
 */
export const fromDate = (d: Date): PlainDate =>
  immutable({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }) as PlainDate;

/**
 * Compara duas datas em ordem cronológica: primeiro o ano, depois o mês, depois o dia. Serve de
 * comparador para `Array.prototype.sort` de datas sem campo `NaN`.
 *
 * @param a - Primeira data.
 * @param b - Segunda data.
 * @returns `-1` quando `a` vem antes de `b`; `0` quando são iguais; `1` quando `a` vem depois ou
 * quando algum dos campos comparados é `NaN`, inclusive ao comparar uma data consigo mesma.
 */
export const compare = (a: PlainDate, b: PlainDate): -1 | 0 | 1 => {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
};

/**
 * Diz se uma data vem estritamente antes de outra.
 *
 * @param a - Data testada.
 * @param b - Data de referência.
 * @returns `true` quando `a` é anterior a `b`; `false` quando são iguais, quando `a` é posterior
 * ou quando algum dos campos comparados é `NaN`.
 */
export const isBefore = (a: PlainDate, b: PlainDate): boolean => compare(a, b) < 0;

/**
 * Diz se uma data vem estritamente depois de outra.
 *
 * @param a - Data testada.
 * @param b - Data de referência.
 * @returns `true` quando `a` é posterior a `b` ou quando algum dos campos comparados é `NaN`,
 * inclusive ao comparar uma data consigo mesma; `false` quando são iguais ou `a` é anterior.
 */
export const isAfter = (a: PlainDate, b: PlainDate): boolean => compare(a, b) > 0;

/**
 * Compara duas datas por valor, não por referência.
 *
 * @param a - Primeira data.
 * @param b - Segunda data.
 * @returns `true` quando ano, mês e dia coincidem, mesmo em instâncias distintas; `false` caso
 * contrário e quando algum dos campos é `NaN`, inclusive ao comparar uma data consigo mesma.
 */
export const equals = (a: PlainDate, b: PlainDate): boolean => compare(a, b) === 0;

/**
 * Junta ano, mês e dia com hífen, completando com zeros à esquerda o texto de cada número: o ano
 * até quatro caracteres, mês e dia até dois, sem nunca truncar. Para todo `PlainDate` devolvido
 * por {@link from}, devolve a string que o originou.
 *
 * @param d - Data a formatar.
 * @returns A string formatada, como `'2026-01-02'`; `'0999-01-01'` para o ano 999;
 * `'12026-01-01'` para o ano 12026; `'00-1-06-01'` para o ano -1; `'0NaN-NaN-NaN'` para campos
 * `NaN`.
 */
export const toISOString = (d: PlainDate): string =>
  `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
