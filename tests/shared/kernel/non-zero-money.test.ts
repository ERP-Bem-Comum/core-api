import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Brand, BrandOf } from '#src/shared/primitives/brand.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as NonZeroMoney from '#src/shared/kernel/non-zero-money.ts';

/**
 * Resolve para `true` quando `X` e `Y` são idênticos, inclusive nos modificadores `readonly`,
 * e para `false` caso contrário.
 *
 * @typeParam X - primeiro tipo comparado.
 * @typeParam Y - segundo tipo comparado.
 */
type Equals<X, Y> =
  (<T>(value: T) => T extends X ? 1 : 2) extends <T>(value: T) => T extends Y ? 1 : 2
    ? true
    : false;

/**
 * Resolve para `true` quando a chave `K` de `T` é `readonly`, e para `false` caso contrário.
 *
 * @typeParam T - tipo inspecionado.
 * @typeParam K - chave de `T` verificada.
 */
type IsReadonlyKey<T, K extends keyof T> =
  Equals<Pick<T, K>, { -readonly [P in K]: T[P] }> extends true ? false : true;

/**
 * Só aceita o literal `true`; usada para transformar `Equals` em erro de compilação.
 *
 * @typeParam T - resultado de uma comparação de tipos.
 */
type Expect<T extends true> = T;

/**
 * Constrói um `Money` válido pelo smart constructor e falha o teste se ele recusar.
 *
 * @param cents - valor em centavos.
 * @returns o `Money` construído.
 */
const money = (cents: number): Money.Money => {
  const r = Money.fromCents(cents);
  assert.equal(r.ok, true);
  return r.ok ? r.value : Money.ZERO;
};

/**
 * Refina um `Money` válido em `NonZeroMoney` e falha o teste se `from` recusar.
 *
 * @param cents - valor em centavos, diferente de zero.
 * @returns o `NonZeroMoney` construído.
 */
const nonZero = (cents: number): NonZeroMoney.NonZeroMoney => {
  const r = NonZeroMoney.from(money(cents));
  if (!r.ok) return assert.fail(r.error);
  return r.value;
};

describe('NonZeroMoney.from — aceitação', () => {
  it('devolve ok para Money de 1 centavo, preservando os centavos', () => {
    const r = NonZeroMoney.from(money(1));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.value.cents, 1);
  });

  it('devolve ok para Money positivo comum, preservando os centavos', () => {
    const r = NonZeroMoney.from(money(500_000));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.value.cents, 500_000);
  });

  it('devolve ok para Money igual a Number.MAX_SAFE_INTEGER', () => {
    const r = NonZeroMoney.from(money(Number.MAX_SAFE_INTEGER));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.value.cents, Number.MAX_SAFE_INTEGER);
  });

  it('devolve no ok um Money novo, igual por valor ao recebido, mas não a mesma referência', () => {
    const m = money(250);
    const r = NonZeroMoney.from(m);
    assert.equal(r.ok, true);
    assert.notEqual(r.ok && r.value, m);
    assert.deepEqual(r, { ok: true, value: { cents: 250 } });
  });

  it('devolve um valor congelado cujos centavos são readonly no tipo e lançam TypeError ao serem reatribuídos', () => {
    const v = nonZero(250);
    assert.equal(Object.isFrozen(v), true);
    const proof: Expect<IsReadonlyKey<NonZeroMoney.NonZeroMoney, 'cents'>> = true;
    assert.equal(proof, true);
    assert.throws(() => Object.assign(v, { cents: 0 }), TypeError);
    assert.equal(v.cents, 250);
  });

  it('não acrescenta em runtime a propriedade __nonZeroMoney ao valor', () => {
    const v = nonZero(250);
    assert.equal('__nonZeroMoney' in v, false);
    assert.deepEqual(Object.keys(v), ['cents']);
  });
});

describe('NonZeroMoney.from — recusa', () => {
  it("devolve err('money-must-be-non-zero') para Money.ZERO", () => {
    const r = NonZeroMoney.from(Money.ZERO);
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.error, 'money-must-be-non-zero');
  });

  it("devolve err('money-must-be-non-zero') para um zero construído por Money.fromCents(0)", () => {
    const r = NonZeroMoney.from(money(0));
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.error, 'money-must-be-non-zero');
  });

  it("devolve err('money-must-be-non-zero') para o zero negativo aceito por Money.fromCents(-0)", () => {
    const negativeZero = money(-0);
    assert.equal(Object.is(negativeZero.cents, -0), true);
    const r = NonZeroMoney.from(negativeZero);
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.error, 'money-must-be-non-zero');
  });

  it("NonZeroMoneyError é exatamente as quatro variantes que from devolve, sem 'money-negative-result'", () => {
    const proof: Expect<
      Equals<
        NonZeroMoney.NonZeroMoneyError,
        | 'money-must-be-non-zero'
        | 'money-non-integer-value'
        | 'money-negative-value'
        | 'money-exceeds-safe-integer'
      >
    > = true;
    const withNegativeResult: Equals<
      NonZeroMoney.NonZeroMoneyError,
      'money-must-be-non-zero' | Money.MoneyError
    > = false;
    assert.equal(proof && !withNegativeResult, true);
  });
});

/**
 * `Money` forjado por cast, sem passar por `Money.fromCents`.
 *
 * @param cents - centavos gravados sem validação.
 * @returns o objeto cru tipado como `Money`.
 */
const forge = (cents: number): Money.Money => ({ cents }) as Money.Money;

/** Centavos forjados que `from` recusa, com o erro de `Money.fromCents` esperado para cada um. */
const FORGED_REJECTED: readonly (readonly [string, number, NonZeroMoney.NonZeroMoneyError])[] = [
  ['negativo -5', -5, 'money-negative-value'],
  ['negativo -1', -1, 'money-negative-value'],
  ['fracionário 1.5', 1.5, 'money-non-integer-value'],
  ['fracionário 0.5', 0.5, 'money-non-integer-value'],
  ['fracionário negativo -0.5', -0.5, 'money-non-integer-value'],
  ['NaN', Number.NaN, 'money-non-integer-value'],
  ['Infinity', Number.POSITIVE_INFINITY, 'money-non-integer-value'],
  ['-Infinity', Number.NEGATIVE_INFINITY, 'money-non-integer-value'],
  ['MAX_SAFE_INTEGER + 1', Number.MAX_SAFE_INTEGER + 1, 'money-exceeds-safe-integer'],
  ['MAX_SAFE_INTEGER + 2', Number.MAX_SAFE_INTEGER + 2, 'money-exceeds-safe-integer'],
];

/**
 * `Money` forjado cujo `cents` é um getter: a primeira leitura devolve `first` e as seguintes
 * devolvem `later`.
 *
 * @param first - valor da primeira leitura.
 * @param later - valor de toda leitura depois da primeira.
 * @returns o objeto tipado como `Money` e uma função que conta as leituras feitas.
 */
const scriptedCents = (
  first: number,
  later: number,
): Readonly<{ money: Money.Money; reads: () => number }> => {
  let count = 0;
  const target = {
    get cents(): number {
      count += 1;
      return count === 1 ? first : later;
    },
  };
  return { money: target as unknown as Money.Money, reads: () => count };
};

/** Getters forjados: [primeira leitura, leituras seguintes, resultado esperado de `from`]. */
const SCRIPTED_GETTER_CASES: readonly (readonly [
  number,
  number,
  Result<{ cents: number }, NonZeroMoney.NonZeroMoneyError>,
])[] = [
  [5, -5, { ok: true, value: { cents: 5 } }],
  [5, 0, { ok: true, value: { cents: 5 } }],
  [5, 1.5, { ok: true, value: { cents: 5 } }],
  [-5, 5, { ok: false, error: 'money-negative-value' }],
  [0, 5, { ok: false, error: 'money-must-be-non-zero' }],
  [1.5, 2, { ok: false, error: 'money-non-integer-value' }],
];

describe('NonZeroMoney.from — recusa de Money forjado', () => {
  for (const [label, cents, expected] of FORGED_REJECTED) {
    it(`devolve err('${expected}') para Money forjado com centavos ${label}`, () => {
      const r = NonZeroMoney.from(forge(cents));
      assert.deepEqual(r, { ok: false, error: expected });
    });
  }

  it('o erro de cada Money forjado é o mesmo que Money.fromCents devolve para os mesmos centavos', () => {
    const mismatches = FORGED_REJECTED.filter(([, cents]) => {
      const viaFrom = NonZeroMoney.from(forge(cents));
      const viaFromCents = Money.fromCents(cents);
      return viaFrom.ok || viaFromCents.ok || viaFrom.error !== viaFromCents.error;
    }).map(([label]) => label);
    assert.deepEqual(mismatches, []);
  });

  it('vizinhas válidas: Money forjado com 1 e com Number.MAX_SAFE_INTEGER centavos é aceito como Money novo e congelado', () => {
    for (const cents of [1, Number.MAX_SAFE_INTEGER]) {
      const m = forge(cents);
      const r = NonZeroMoney.from(m);
      assert.deepEqual(r, { ok: true, value: { cents } });
      assert.notEqual(r.ok && r.value, m);
      assert.equal(r.ok && Object.isFrozen(r.value), true);
    }
  });

  it('Money forjado e mutável: reatribuir cents depois do ok não altera o NonZeroMoney devolvido', () => {
    const m = { cents: 5 };
    const r = NonZeroMoney.from(m as unknown as Money.Money);
    m.cents = -7;
    assert.deepEqual(r, { ok: true, value: { cents: 5 } });
  });

  for (const [first, later, expected] of SCRIPTED_GETTER_CASES) {
    it(`Money forjado com getter que devolve ${String(first)} e depois ${String(later)}: from lê cents uma vez e devolve ${JSON.stringify(expected)}`, () => {
      const forged = scriptedCents(first, later);
      const r = NonZeroMoney.from(forged.money);
      assert.equal(forged.reads(), 1);
      assert.deepEqual(r, expected);
    });
  }

  it("Money forjado com zero centavos continua devolvendo err('money-must-be-non-zero')", () => {
    assert.deepEqual(NonZeroMoney.from(forge(0)), { ok: false, error: 'money-must-be-non-zero' });
  });
});

describe('NonZeroMoney.from — regressão para Money vindo de Money.fromCents', () => {
  const REALISTIC_CENTS: readonly number[] = [
    1,
    2,
    99,
    100,
    500_000,
    99_999_999,
    Number.MAX_SAFE_INTEGER,
  ];

  it('para cada centavo realista, devolve ok com centavos iguais aos do Money recebido, por Money.equals', () => {
    const notEqual = REALISTIC_CENTS.filter((cents) => {
      const m = money(cents);
      const r = NonZeroMoney.from(m);
      return !(r.ok && Money.equals(r.value, m) && r.value.cents === cents);
    });
    assert.deepEqual(notEqual, []);
  });

  it('para cada centavo realista, o ok é estruturalmente igual ao Money.fromCents dos mesmos centavos', () => {
    const results = REALISTIC_CENTS.map((cents) => NonZeroMoney.from(money(cents)));
    assert.deepEqual(
      results,
      REALISTIC_CENTS.map((cents) => Money.fromCents(cents)),
    );
  });
});

describe('NonZeroMoney — relação de tipos com Money', () => {
  it('é subtipo de Money: Money.add, subtract, equals e greaterThan aceitam NonZeroMoney sem cast', () => {
    const a = nonZero(300);
    const b = nonZero(100);
    const sum = Money.add(a, b);
    assert.equal(sum.ok && sum.value.cents, 400);
    const diff = Money.subtract(a, b);
    assert.equal(diff.ok && diff.value.cents, 200);
    assert.equal(Money.equals(a, money(300)), true);
    assert.equal(Money.greaterThan(a, b), true);
  });

  it('é atribuível a uma variável do tipo Money', () => {
    const widened: Money.Money = nonZero(10);
    const proof: Expect<
      Equals<NonZeroMoney.NonZeroMoney extends Money.Money ? true : false, true>
    > = true;
    assert.equal(proof, true);
    assert.equal(widened.cents, 10);
  });

  it('recusa em compilação a atribuição direta de Money a NonZeroMoney', () => {
    const proof: Expect<
      Equals<Money.Money extends NonZeroMoney.NonZeroMoney ? true : false, false>
    > = true;
    assert.equal(proof, true);
  });

  it('mantém a marca Money: BrandOf<NonZeroMoney> é Money', () => {
    const proof: Expect<Equals<BrandOf<NonZeroMoney.NonZeroMoney>, 'Money'>> = true;
    assert.equal(proof, true);
  });

  it('declara __nonZeroMoney como true no tipo', () => {
    const proof: Expect<Equals<NonZeroMoney.NonZeroMoney['__nonZeroMoney'], true>> = true;
    assert.equal(proof, true);
  });

  it('recusa em compilação a escrita em __nonZeroMoney, que é readonly', () => {
    const proof: Expect<IsReadonlyKey<NonZeroMoney.NonZeroMoney, '__nonZeroMoney'>> = true;
    const mutableControl: Expect<Equals<IsReadonlyKey<{ marker: true }, 'marker'>, false>> = true;
    assert.equal(proof && mutableControl, true);
    assert.throws(() => Object.assign(nonZero(7), { __nonZeroMoney: true }), TypeError);
  });

  it("o resultado de Money.add entre dois NonZeroMoney é Result<Money, 'money-exceeds-safe-integer'>, não NonZeroMoney", () => {
    const sum = Money.add(nonZero(1), nonZero(2));
    const proof: Expect<Equals<typeof sum, Result<Money.Money, 'money-exceeds-safe-integer'>>> =
      true;
    assert.equal(proof, true);
  });

  it("o resultado de Money.subtract entre dois NonZeroMoney é Result<Money, 'money-negative-result'>, não NonZeroMoney", () => {
    const diff = Money.subtract(nonZero(3), nonZero(1));
    const proof: Expect<Equals<typeof diff, Result<Money.Money, 'money-negative-result'>>> = true;
    assert.equal(proof, true);
  });

  it('Money.subtract entre dois NonZeroMoney iguais devolve ok com zero centavos', () => {
    const diff = Money.subtract(nonZero(42), nonZero(42));
    assert.equal(diff.ok, true);
    assert.equal(diff.ok && diff.value.cents, 0);
  });

  it('Brand<Money, NonZeroMoney> colapsa para never', () => {
    const proof: Expect<Equals<Brand<Money.Money, 'NonZeroMoney'>, never>> = true;
    assert.equal(proof, true);
  });
});
