import { type Result, ok, err } from '../primitives/result.ts';
import { immutable } from '../primitives/immutable.ts';
import type { Brand } from '../primitives/brand.ts';

/**
 * Valor monetário em centavos: objeto `{ cents }` brandado com a marca literal `'Money'`. Um
 * objeto `{ cents }` cru não é atribuível a `Money`.
 */
export type Money = Brand<{ readonly cents: number }, 'Money'>;

/**
 * União exata das variantes de erro do módulo: `'money-negative-value'`,
 * `'money-non-integer-value'` e `'money-exceeds-safe-integer'` vêm de {@link fromCents};
 * `'money-exceeds-safe-integer'` vem também de {@link add} e de {@link sum}; `'money-negative-result'` vem de
 * {@link subtract}.
 */
export type MoneyError =
  | 'money-negative-value'
  | 'money-non-integer-value'
  | 'money-exceeds-safe-integer'
  | 'money-negative-result';

const frozenMoney = (cents: number): Money => immutable({ cents }) as Money;

/**
 * Zero centavos. Congelado: atribuir a `cents` lança `TypeError` e o valor permanece 0. Igual por
 * valor a `fromCents(0)`, mas não a mesma referência.
 */
export const ZERO: Money = frozenMoney(0);

/**
 * Constrói um {@link Money} a partir de centavos. A checagem de inteiro precede a de sinal, e
 * `-0` é aceito com `cents` igual a `-0`. Cada chamada devolve um objeto novo e congelado.
 *
 * @param cents - Quantidade de centavos.
 * @returns `{ ok: true, value }` para inteiro de 0 a `Number.MAX_SAFE_INTEGER`, inclusive;
 *   `'money-non-integer-value'` para número fracionário (inclusive negativo e fracionário), `NaN`,
 *   `Infinity` e `-Infinity`; `'money-negative-value'` para inteiro negativo;
 *   `'money-exceeds-safe-integer'` para inteiro acima de `Number.MAX_SAFE_INTEGER`. O tipo do erro
 *   é {@link MoneyError} sem `'money-negative-result'`.
 * @example
 * ```ts
 * import * as Money from '#src/shared/kernel/money.ts';
 *
 * Money.fromCents(12345); // { ok: true, value: { cents: 12345 } }
 * Money.fromCents(1.5); // { ok: false, error: 'money-non-integer-value' }
 * ```
 */
export const fromCents = (
  cents: number,
): Result<Money, Exclude<MoneyError, 'money-negative-result'>> => {
  if (!Number.isInteger(cents)) return err('money-non-integer-value');
  if (cents < 0) return err('money-negative-value');
  if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
  return ok(frozenMoney(cents));
};

/**
 * Soma os centavos dos dois operandos e recusa só a soma acima de `Number.MAX_SAFE_INTEGER`; não
 * revalida com {@link fromCents}, então um `Money` forjado com centavos fracionário, negativo ou
 * `NaN` produz soma aceita que {@link fromCents} recusaria. Somar {@link ZERO} de qualquer lado
 * devolve centavos iguais por {@link equals}; com `-0`, o resultado é `+0`. A ordem dos operandos
 * não altera o resultado.
 *
 * @param a - Primeira parcela.
 * @param b - Segunda parcela.
 * @returns `{ ok: true, value }` com a soma, num objeto novo e congelado, sem alterar os operandos,
 *   quando ela vai até `Number.MAX_SAFE_INTEGER`, inclusive; `'money-exceeds-safe-integer'` quando
 *   passa dele. O tipo do erro é só `'money-exceeds-safe-integer'`.
 */
export const add = (a: Money, b: Money): Result<Money, 'money-exceeds-safe-integer'> => {
  const sum = a.cents + b.cents;
  if (sum > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
  return ok(frozenMoney(sum));
};

/**
 * Soma as parcelas encadeando {@link add} a partir de {@link ZERO}, com o mesmo veredito de
 * encadear {@link add} sobre elas.
 *
 * @param values - Parcelas; qualquer `Iterable`, não só array.
 * @returns `{ ok: true, value }` com a soma, num objeto congelado, sem alterar as parcelas, quando
 *   ela vai até `Number.MAX_SAFE_INTEGER`, inclusive; o próprio {@link ZERO} sem parcelas;
 *   `'money-exceeds-safe-integer'` quando a soma passa de `Number.MAX_SAFE_INTEGER`. O tipo do erro
 *   é só `'money-exceeds-safe-integer'`.
 */
export const sum = (values: Iterable<Money>): Result<Money, 'money-exceeds-safe-integer'> => {
  let total: Money = ZERO;
  for (const value of values) {
    const next = add(total, value);
    if (!next.ok) return next;
    total = next.value;
  }
  return ok(total);
};

/**
 * Subtrai os centavos de `b` dos de `a`.
 *
 * @param a - Minuendo.
 * @param b - Subtraendo.
 * @returns `{ ok: true, value }` com a diferença, congelada, quando `a` tem centavos maiores ou
 *   iguais aos de `b` (valores iguais dão 0 centavos num objeto que não é {@link ZERO});
 *   `'money-negative-result'` quando a diferença seria negativa. O tipo do erro é só
 *   `'money-negative-result'`.
 */
export const subtract = (a: Money, b: Money): Result<Money, 'money-negative-result'> => {
  const diff = a.cents - b.cents;
  if (diff < 0) return err('money-negative-result');
  return ok(frozenMoney(diff));
};

/**
 * Compara dois valores por centavos: objetos distintos com os mesmos centavos são iguais, e
 * `-0` é igual a {@link ZERO}.
 *
 * @param a - Primeiro valor.
 * @param b - Segundo valor.
 * @returns `true` quando os centavos são iguais; `false` quando diferem.
 */
export const equals = (a: Money, b: Money): boolean => a.cents === b.cents;

/**
 * Comparação estrita de centavos.
 *
 * @param a - Valor testado.
 * @param b - Valor de referência.
 * @returns `true` quando `a` tem mais centavos que `b`; `false` quando são iguais ou quando `a`
 *   tem menos.
 */
export const greaterThan = (a: Money, b: Money): boolean => a.cents > b.cents;
