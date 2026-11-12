import { type Result, ok, err } from '../primitives/result.ts';
import { immutable } from '../primitives/immutable.ts';
import * as PlainDate from './plain-date.ts';
import type { Brand } from '../primitives/brand.ts';

/**
 * Forma estrutural de um período: `Fixed` tem início e fim; `Indefinite` tem só início, sem a
 * propriedade `end`. Início e fim são `PlainDate` (ano, mês, dia), não `Date`.
 */
type PeriodShape =
  | Readonly<{
      /** Discriminante do período com início e fim. */
      kind: 'Fixed';
      /** Primeiro dia do período, incluído na faixa. */
      start: PlainDate.PlainDate;
      /** Último dia do período, incluído na faixa. */
      end: PlainDate.PlainDate;
    }>
  | Readonly<{
      /** Discriminante do período sem fim. */
      kind: 'Indefinite';
      /** Primeiro dia do período, incluído na faixa. */
      start: PlainDate.PlainDate;
    }>;

/**
 * Vigência de calendário, `Fixed` ou `Indefinite`, congelada e com marca nominal: objeto literal
 * cru, `Fixed` ou `Indefinite`, não é atribuível a `Period`. Construída por {@link create} ou
 * {@link createIndefinite}.
 */
export type Period = Brand<PeriodShape, 'Period'>;

/**
 * Motivos de recusa de {@link create}: `'period-end-before-start'` quando o fim é anterior ao
 * início e `'period-zero-duration'` quando início e fim são o mesmo dia.
 */
export type PeriodError = 'period-end-before-start' | 'period-zero-duration';

/**
 * Cria um período `Fixed` congelado, guardando início e fim como `PlainDate`. Valida só a ordem
 * entre as datas e confia no `PlainDate` recebido, sem revalidar o calendário nem o limite de ano
 * 2000: um `PlainDate` de ano anterior a 2000 (de `PlainDate.fromDate`) é aceito.
 *
 * @param start - Primeiro dia do período.
 * @param end - Último dia do período; precisa ser ao menos um dia depois de `start`.
 * @returns `ok` com o período `Fixed` quando `end` é posterior a `start`;
 * `err('period-end-before-start')` quando `end` é anterior a `start`;
 * `err('period-zero-duration')` quando `end` é igual a `start`.
 * @example
 * ```ts
 * const start = PlainDate.fromDate(new Date('2026-03-10T00:00:00Z'));
 * const end = PlainDate.fromDate(new Date('2026-03-11T00:00:00Z'));
 * const r = start.ok && end.ok ? Period.create(start.value, end.value) : undefined;
 * ```
 */
export const create = (
  start: PlainDate.PlainDate,
  end: PlainDate.PlainDate,
): Result<Period, PeriodError> => {
  const endVersusStart = PlainDate.compare(end, start);
  if (endVersusStart < 0) return err('period-end-before-start');
  if (endVersusStart === 0) return err('period-zero-duration');
  return ok(immutable({ kind: 'Fixed' as const, start, end }) as Period);
};

/**
 * Cria um período `Indefinite` congelado, só com início e sem a propriedade `end`.
 *
 * @param start - Primeiro dia do período.
 * @returns O período `Indefinite` que começa em `start`.
 */
export const createIndefinite = (start: PlainDate.PlainDate): Period =>
  immutable({ kind: 'Indefinite' as const, start }) as Period;

/**
 * Testa se um instante cai na faixa de calendário do período. O instante é projetado para a sua
 * data-calendário UTC, não para a data local, antes da comparação. A faixa é inclusiva no dia de
 * início e no dia de fim, até o último milissegundo; um período `Indefinite` não tem limite
 * superior.
 *
 * @param p - Período de referência.
 * @param instant - Instante a testar.
 * @returns `true` quando a data UTC de `instant` está entre o início e o fim, inclusive (ou a
 * partir do início, em `Indefinite`); `false` fora da faixa ou quando `instant` é um `Date`
 * inválido (`NaN`).
 */
export const contains = (p: Period, instant: Date): boolean => {
  const utcDay = PlainDate.fromDate(instant);
  if (!utcDay.ok) return false;
  switch (p.kind) {
    case 'Fixed':
      return (
        PlainDate.compare(utcDay.value, p.start) >= 0 && PlainDate.compare(utcDay.value, p.end) <= 0
      );
    case 'Indefinite':
      return PlainDate.compare(utcDay.value, p.start) >= 0;
  }
};

/**
 * Compara dois períodos por valor, independentemente da instância.
 *
 * @param a - Primeiro período.
 * @param b - Segundo período.
 * @returns `true` quando ambos são `Fixed` com mesmo início e mesmo fim, ou ambos `Indefinite`
 * com mesmo início; `false` quando o início, o fim ou o `kind` diferem, em qualquer ordem dos
 * argumentos.
 */
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

/**
 * Diz se o período não tem fim.
 *
 * @param p - Período a inspecionar.
 * @returns `true` para período criado por {@link createIndefinite}; `false` para período criado
 * por {@link create}.
 */
export const isIndefinite = (p: Period): boolean => p.kind === 'Indefinite';
