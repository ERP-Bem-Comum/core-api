import { type Result, ok, err } from '../primitives/result.ts';
import type { Money } from './money.ts';

/**
 * Refinamento de `Money` que garante estática e atemporal: `m.cents !== 0`.
 *
 * Rota α (DO D§25): codifica invariante reusável em qualquer contexto que
 * exija "valor monetário não-zero" — Contratos, Faturamento, Orçamento, etc.
 *
 * Shared Kernel (§3.H.4 DO H§36): cross-BC por extensão de Money.
 *
 * ## Polimorfismo (widening automático)
 *
 * `NonZeroMoney` é definida como `Money & { readonly __nonZeroMoney: true }`.
 * Isso garante `NonZeroMoney extends Money` (subtipo estrutural), portanto
 * operações que aceitam `Money` (`add`, `subtract`, `equals`) aceitam
 * `NonZeroMoney` sem cast.
 *
 * ## Por que não `Brand<Money, 'NonZeroMoney'>`?
 *
 * `Brand<T, K>` é `T & { [__brand]: K }` onde `__brand` é `unique symbol`.
 * `Brand<Money, 'NonZeroMoney'>` = `Money & { [__brand]: 'NonZeroMoney' }` =
 * `{ cents } & { [__brand]: 'Money' } & { [__brand]: 'NonZeroMoney' }`.
 * Como `__brand` é `unique symbol`, a propriedade teria dois tipos literais
 * incompatíveis → `never`. O campo auxiliar `__nonZeroMoney` tem nome distinto,
 * evitando o conflito. Essa é a abordagem canônica para refinamento de brand
 * sobre brand no padrão do projeto (DO B§11 — unique symbol global).
 *
 * ## Produção
 *
 * Somente via smart constructor `from(m)`. O cast `as NonZeroMoney` é
 * deliberado — única forma de produzir o campo auxiliar após o predicate
 * (padrão canônico, DO B§9 + ref ts-branded-types.md).
 *
 * Referência: `handbook/interviews/0001-functional-ddd-domain-refresh.md`,
 * Bloco D D5 (Invariantes contextuais) — DO D§25.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type NonZeroMoney = Money & { readonly __nonZeroMoney: true };

export type NonZeroMoneyError = 'money-must-be-non-zero';

/** Smart constructor — refina um Money pré-validado para NonZeroMoney. */
export const from = (m: Money): Result<NonZeroMoney, NonZeroMoneyError> =>
  m.cents === 0 ? err('money-must-be-non-zero') : ok(m as NonZeroMoney);
