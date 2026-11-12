import { type Result, ok, err } from '../primitives/result.ts';
import { type Money, type MoneyError, fromCents } from './money.ts';

/**
 * `Money` refinado que, quando produzido por {@link from}, tem `cents` inteiro de 1 a
 * `Number.MAX_SAFE_INTEGER`, inclusive.
 *
 * É subtipo de `Money`: é atribuível a `Money` e é aceito sem cast por `Money.add`,
 * `Money.subtract`, `Money.equals` e `Money.greaterThan`. `Money.add` entre dois
 * `NonZeroMoney` devolve `Result<Money, 'money-exceeds-safe-integer'>`, não `NonZeroMoney`.
 * `Money.subtract` entre dois `NonZeroMoney` devolve `Result<Money, 'money-negative-result'>`, e
 * entre dois iguais devolve `ok` com zero centavos. Mantém a marca de `Money`
 * (`BrandOf<NonZeroMoney>` é `'Money'`).
 *
 * `Money` não é atribuível a `NonZeroMoney`.
 *
 * O membro `__nonZeroMoney` existe só no tipo: é `readonly`, tem o tipo `true` e não está
 * presente no valor em runtime. O duplo underscore do nome é exceção declarada da convenção de
 * nomes.
 *
 * @see tests/cleanup/lint-gaps.test.ts
 */
export type NonZeroMoney = Money & { readonly __nonZeroMoney: true };

/**
 * Erro devolvido por {@link from}: `'money-must-be-non-zero'`, `'money-non-integer-value'`,
 * `'money-negative-value'` ou `'money-exceeds-safe-integer'`. Não inclui
 * `'money-negative-result'`.
 */
export type NonZeroMoneyError =
  | 'money-must-be-non-zero'
  | Exclude<MoneyError, 'money-negative-result'>;

/**
 * Refina um `Money` em `NonZeroMoney`. Lê `m.cents` uma única vez e revalida essa leitura com
 * `Money.fromCents` antes de verificar se é zero.
 *
 * @param m - o `Money` a refinar.
 * @returns `ok` com o `Money` novo e congelado que `Money.fromCents` constrói a partir da leitura,
 * igual por valor a `m` mas sem ser a mesma referência e sem a propriedade `__nonZeroMoney`,
 * quando essa leitura é inteiro de 1 a `Number.MAX_SAFE_INTEGER`; alterar `m` depois não altera o
 * valor devolvido, e reatribuir `cents` nele lança `TypeError`;
 * `err('money-non-integer-value')` para `cents` fracionário, `NaN`, `Infinity` ou `-Infinity`;
 * `err('money-negative-value')` para `cents` inteiro negativo; `err('money-exceeds-safe-integer')`
 * para `cents` inteiro acima de `Number.MAX_SAFE_INTEGER`; `err('money-must-be-non-zero')` quando
 * `m.cents` é `0` ou `-0`.
 * @example
 * ```ts
 * const r = from(Money.ZERO);
 * // r: { ok: false, error: 'money-must-be-non-zero' }
 * ```
 */
export const from = (m: Money): Result<NonZeroMoney, NonZeroMoneyError> => {
  const valid = fromCents(m.cents);
  if (!valid.ok) return valid;
  return valid.value.cents === 0 ? err('money-must-be-non-zero') : ok(valid.value as NonZeroMoney);
};
