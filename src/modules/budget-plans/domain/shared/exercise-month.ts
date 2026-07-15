import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): consumir com `import * as ExerciseMonth from './exercise-month.ts'`.

// Mês do exercício do plano (#413). O exercício é o ano civil: 1..12, inteiro.
export type ExerciseMonth = Brand<number, 'ExerciseMonth'>;
export type ExerciseMonthError = 'exercise-month-invalid';

const FIRST = 1;
const LAST = 12;

// Number.isInteger já barra NaN, Infinity e fração — não precisa de guarda extra.
const isWithinExercise = (raw: number): boolean =>
  Number.isInteger(raw) && raw >= FIRST && raw <= LAST;

export const parse = (raw: number): Result<ExerciseMonth, ExerciseMonthError> =>
  isWithinExercise(raw) ? ok(raw as ExerciseMonth) : err('exercise-month-invalid');

// Row -> domínio. Mesma regra do parse: o domínio não confia no banco, mesmo com o CHECK no lugar.
export const rehydrate = (raw: number): Result<ExerciseMonth, ExerciseMonthError> => parse(raw);
