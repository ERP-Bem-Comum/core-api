import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Result } from '#src/shared/index.ts';
import type { BrandOf } from '#src/shared/primitives/brand.ts';
import * as Money from '#src/shared/kernel/money.ts';

/** Igualdade de tipos em tempo de compilação. */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** `true` quando `From` é atribuível a `To` em tempo de compilação. */
type IsAssignable<From, To> = [From] extends [To] ? true : false;

/** Constrói um `Money` válido a partir de centavos, falhando o teste se `fromCents` recusar. */
const money = (cents: number): Money.Money => {
  const r = Money.fromCents(cents);
  assert.equal(r.ok, true);
  return r.value;
};

describe('Money — módulo como namespace', () => {
  it('importado com `import * as Money`, expõe em runtime exatamente ZERO, add, equals, fromCents, greaterThan, subtract e sum', () => {
    assert.deepEqual(Object.keys(Money), [
      'ZERO',
      'add',
      'equals',
      'fromCents',
      'greaterThan',
      'subtract',
      'sum',
    ]);
  });
});

describe('Money — tipo', () => {
  it("Money é um tipo brandado com a marca 'Money'", () => {
    const brand: Equals<BrandOf<Money.Money>, 'Money'> = true;
    assert.equal(brand, true);
  });

  it('um objeto `{ cents }` cru não é atribuível a Money', () => {
    const accepts: IsAssignable<{ readonly cents: number }, Money.Money> = false;
    assert.equal(accepts, false);
  });

  it("o erro de add, 'money-exceeds-safe-integer', é membro de MoneyError", () => {
    const member: IsAssignable<'money-exceeds-safe-integer', Money.MoneyError> = true;
    assert.equal(member, true);
  });

  it('MoneyError é a união das quatro variantes kebab-case', () => {
    const exact: Equals<
      Money.MoneyError,
      | 'money-negative-value'
      | 'money-non-integer-value'
      | 'money-exceeds-safe-integer'
      | 'money-negative-result'
    > = true;
    assert.equal(exact, true);
  });
});

describe('Money.ZERO', () => {
  it('vale 0 centavos', () => {
    assert.equal(Money.ZERO.cents, 0);
  });

  it('está congelado: atribuir a `cents` lança TypeError e o valor permanece 0', () => {
    assert.equal(Object.isFrozen(Money.ZERO), true);
    assert.throws(() => {
      (Money.ZERO as { cents: number }).cents = 5;
    }, TypeError);
    assert.equal(Money.ZERO.cents, 0);
  });

  it('é igual por valor a fromCents(0), mas não é a mesma referência', () => {
    const zero = money(0);
    assert.equal(Money.equals(Money.ZERO, zero), true);
    assert.notEqual(Money.ZERO, zero);
  });
});

describe('Money.fromCents', () => {
  it('devolve um Result: `{ ok: true, value }` para inteiro não negativo', () => {
    const r = Money.fromCents(12345);
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.value.cents, 12345);
  });

  it('fromCents(12345) é estruturalmente `{ ok: true, value: { cents: 12345 } }`', () => {
    assert.deepEqual(Money.fromCents(12345), { ok: true, value: { cents: 12345 } });
  });

  it('aceita 0', () => {
    assert.equal(money(0).cents, 0);
  });

  it('aceita exatamente Number.MAX_SAFE_INTEGER', () => {
    assert.equal(money(Number.MAX_SAFE_INTEGER).cents, Number.MAX_SAFE_INTEGER);
  });

  it('o Money devolvido está congelado', () => {
    assert.equal(Object.isFrozen(money(10)), true);
  });

  it('cada chamada devolve um objeto novo', () => {
    assert.notEqual(money(10), money(10));
  });

  it("recusa número fracionário com 'money-non-integer-value'", () => {
    assert.deepEqual(Money.fromCents(1.5), { ok: false, error: 'money-non-integer-value' });
  });

  it("recusa NaN, Infinity e -Infinity com 'money-non-integer-value'", () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.deepEqual(Money.fromCents(v), { ok: false, error: 'money-non-integer-value' });
    }
  });

  it("recusa inteiro negativo com 'money-negative-value'", () => {
    assert.deepEqual(Money.fromCents(-1), { ok: false, error: 'money-negative-value' });
  });

  it("número negativo e fracionário é recusado como 'money-non-integer-value', não como negativo", () => {
    assert.deepEqual(Money.fromCents(-1.5), { ok: false, error: 'money-non-integer-value' });
  });

  it('aceita -0 e devolve cents igual a -0', () => {
    const r = Money.fromCents(-0);
    assert.equal(r.ok, true);
    assert.equal(r.ok && Object.is(r.value.cents, -0), true);
  });

  it("recusa Number.MAX_SAFE_INTEGER + 1 com 'money-exceeds-safe-integer'", () => {
    assert.deepEqual(Money.fromCents(Number.MAX_SAFE_INTEGER + 1), {
      ok: false,
      error: 'money-exceeds-safe-integer',
    });
  });

  it("o tipo do erro é MoneyError sem 'money-negative-result'", () => {
    const typed: Equals<
      ReturnType<typeof Money.fromCents>,
      Result<
        Money.Money,
        'money-negative-value' | 'money-non-integer-value' | 'money-exceeds-safe-integer'
      >
    > = true;
    const wider: Equals<
      ReturnType<typeof Money.fromCents>,
      Result<Money.Money, Money.MoneyError>
    > = false;
    assert.equal(typed && !wider, true);
  });

  it("nenhuma entrada de uma tabela adversa faz fromCents devolver 'money-negative-result'", () => {
    const inputs = [
      -1,
      -0.5,
      -Number.MAX_SAFE_INTEGER,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
      0.1,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MAX_VALUE,
    ];
    const errors = inputs.map((v) => {
      const r = Money.fromCents(v);
      return r.ok ? 'ok' : r.error;
    });
    assert.deepEqual(errors, [
      'money-negative-value',
      'money-non-integer-value',
      'money-negative-value',
      'money-non-integer-value',
      'money-non-integer-value',
      'money-non-integer-value',
      'money-exceeds-safe-integer',
      'money-exceeds-safe-integer',
    ]);
  });
});

/** Desembrulha a soma, falhando o teste se `add` recusar. */
const sumOk = (a: Money.Money, b: Money.Money): Money.Money => {
  const r = Money.add(a, b);
  assert.equal(r.ok, true, `add(${a.cents}, ${b.cents}) deveria ser ok`);
  return (r as { ok: true; value: Money.Money }).value;
};

const MAX = Number.MAX_SAFE_INTEGER;

/** Casos fixos de soma aceita: [a, b, soma esperada]. */
const ACCEPTED_SUMS: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [150, 250, 400],
  [MAX - 1, 1, MAX],
  [MAX, 0, MAX],
  [1, MAX - 1, MAX],
  [10_000_000, 500_000, 10_500_000],
];

/** Casos fixos de soma recusada: [a, b]. */
const REJECTED_SUMS: readonly (readonly [number, number])[] = [
  [MAX, 1],
  [1, MAX],
  [MAX, MAX],
  [MAX - 1, 2],
  [2 ** 52, 2 ** 52],
];

/** Operandos forjados por cast: [centavos forjados, erro que fromCents daria para a soma com ZERO]. */
const FORGED_OPERANDS: readonly (readonly [number, Money.MoneyError])[] = [
  [0.5, 'money-non-integer-value'],
  [-5, 'money-negative-value'],
  [Number.NaN, 'money-non-integer-value'],
];

describe('Money.add', () => {
  for (const [a, b, expected] of ACCEPTED_SUMS) {
    it(`soma os centavos dos dois operandos: add(${a}, ${b}) é ok com ${expected}`, () => {
      assert.deepEqual(Money.add(money(a), money(b)), { ok: true, value: { cents: expected } });
    });
  }

  for (const [a, b] of REJECTED_SUMS) {
    it(`recusa soma acima de Number.MAX_SAFE_INTEGER com 'money-exceeds-safe-integer': add(${a}, ${b})`, () => {
      assert.deepEqual(Money.add(money(a), money(b)), {
        ok: false,
        error: 'money-exceeds-safe-integer',
      });
    });
  }

  it('aceita exatamente Number.MAX_SAFE_INTEGER, inclusive, e recusa o inteiro seguinte', () => {
    assert.equal(sumOk(money(MAX - 1), money(1)).cents, MAX);
    assert.equal(Money.add(money(MAX), money(1)).ok, false);
  });

  it('a ordem dos operandos não altera o resultado (casos aceitos e recusados)', () => {
    for (const [a, b] of ACCEPTED_SUMS) {
      assert.deepEqual(Money.add(money(a), money(b)), Money.add(money(b), money(a)));
    }
    for (const [a, b] of REJECTED_SUMS) {
      assert.deepEqual(Money.add(money(a), money(b)), Money.add(money(b), money(a)));
    }
  });

  it('com operandos válidos, recusa só a soma acima de Number.MAX_SAFE_INTEGER, o mesmo veredito de fromCents', () => {
    for (const [a, b] of [...ACCEPTED_SUMS, ...REJECTED_SUMS]) {
      const viaAdd = Money.add(money(a), money(b));
      const viaFromCents = Money.fromCents(a + b);
      assert.equal(viaAdd.ok, viaFromCents.ok, `add(${a}, ${b})`);
    }
  });

  for (const [cents, fromCentsError] of FORGED_OPERANDS) {
    it(`não revalida com fromCents: Money forjado com ${cents} centavos dá soma aceita que fromCents recusa com '${fromCentsError}'`, () => {
      const forged = { cents } as Money.Money;
      const viaAdd = Money.add(forged, Money.ZERO);
      assert.equal(viaAdd.ok, true);
      assert.equal(
        Object.is((viaAdd as { ok: true; value: Money.Money }).value.cents, cents),
        true,
      );
      assert.deepEqual(Money.fromCents(cents), { ok: false, error: fromCentsError });
    });
  }

  it('somar ZERO de qualquer lado devolve centavos iguais por equals', () => {
    const x = money(77);
    assert.equal(Money.equals(sumOk(x, Money.ZERO), x), true);
    assert.equal(Money.equals(sumOk(Money.ZERO, x), x), true);
  });

  it('com -0, somar ZERO de qualquer lado devolve +0', () => {
    const negativeZero = money(-0);
    assert.equal(Object.is(sumOk(negativeZero, Money.ZERO).cents, 0), true);
    assert.equal(Object.is(sumOk(Money.ZERO, negativeZero).cents, 0), true);
  });

  it('devolve um objeto novo e congelado, sem alterar os operandos', () => {
    const a = money(1);
    const b = money(2);
    const sum = sumOk(a, b);
    assert.equal(Object.isFrozen(sum), true);
    assert.notEqual(sum, a);
    assert.notEqual(sum, b);
    assert.equal(a.cents, 1);
    assert.equal(b.cents, 2);
  });

  it('a recusa não altera os operandos', () => {
    const a = money(MAX);
    const b = money(1);
    Money.add(a, b);
    assert.equal(a.cents, MAX);
    assert.equal(b.cents, 1);
  });

  it("o tipo do erro é só 'money-exceeds-safe-integer'", () => {
    const typed: Equals<
      ReturnType<typeof Money.add>,
      Result<Money.Money, 'money-exceeds-safe-integer'>
    > = true;
    assert.equal(typed, true);
  });
});

describe('Money.sum', () => {
  it('soma as parcelas de uma lista', () => {
    assert.deepEqual(Money.sum([money(104500), money(30000), money(1)]), {
      ok: true,
      value: { cents: 134501 },
    });
  });

  it('lista vazia devolve ZERO', () => {
    const r = Money.sum([]);
    assert.equal(r.ok, true);
    assert.equal((r as { ok: true; value: Money.Money }).value, Money.ZERO);
  });

  it('aceita qualquer Iterable, não só array', () => {
    function* parcels(): Generator<Money.Money> {
      yield money(2);
      yield money(3);
    }
    assert.deepEqual(Money.sum(parcels()), { ok: true, value: { cents: 5 } });
  });

  it('aceita soma igual a Number.MAX_SAFE_INTEGER, inclusive', () => {
    assert.deepEqual(Money.sum([money(5_000_000_000_000_000), money(4_007_199_254_740_991)]), {
      ok: true,
      value: { cents: MAX },
    });
  });

  it("recusa soma acima de Number.MAX_SAFE_INTEGER com 'money-exceeds-safe-integer'", () => {
    assert.deepEqual(Money.sum([money(MAX), money(1)]), {
      ok: false,
      error: 'money-exceeds-safe-integer',
    });
  });

  it('recusa o estouro mesmo quando parcelas posteriores são zero', () => {
    assert.deepEqual(Money.sum([money(MAX), money(1), Money.ZERO]), {
      ok: false,
      error: 'money-exceeds-safe-integer',
    });
  });

  it('dá o mesmo veredito que encadear Money.add sobre as parcelas', () => {
    const lists: readonly (readonly number[])[] = [
      [1, 2, 3],
      [MAX - 1, 1],
      [MAX, 1],
      [MAX, 0, 1],
    ];
    for (const cents of lists) {
      let viaAdd: Result<Money.Money, 'money-exceeds-safe-integer'> = {
        ok: true,
        value: Money.ZERO,
      };
      for (const c of cents) {
        if (!viaAdd.ok) break;
        viaAdd = Money.add(viaAdd.value, money(c));
      }
      assert.deepEqual(Money.sum(cents.map(money)), viaAdd, `sum(${cents.join(', ')})`);
    }
  });

  it('valor negativo não é Money: fromCents o recusa, então sum nunca o recebe por construção', () => {
    assert.deepEqual(Money.fromCents(-1), { ok: false, error: 'money-negative-value' });
  });

  it('devolve um objeto congelado, sem alterar as parcelas', () => {
    const a = money(1);
    const b = money(2);
    const r = Money.sum([a, b]);
    assert.equal(r.ok, true);
    assert.equal(Object.isFrozen((r as { ok: true; value: Money.Money }).value), true);
    assert.equal(a.cents, 1);
    assert.equal(b.cents, 2);
  });

  it("o tipo do erro é só 'money-exceeds-safe-integer'", () => {
    const typed: Equals<
      ReturnType<typeof Money.sum>,
      Result<Money.Money, 'money-exceeds-safe-integer'>
    > = true;
    assert.equal(typed, true);
  });
});

describe('Money.subtract', () => {
  it('devolve `{ ok: true, value }` com a diferença quando a >= b', () => {
    const r = Money.subtract(money(500), money(120));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.value.cents, 380);
  });

  it('subtrair valores iguais devolve 0 centavos, num objeto que não é ZERO', () => {
    const r = Money.subtract(money(42), money(42));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.value.cents, 0);
    assert.equal(r.ok && r.value !== Money.ZERO, true);
  });

  it('o Money devolvido está congelado', () => {
    const r = Money.subtract(money(9), money(4));
    assert.equal(r.ok && Object.isFrozen(r.value), true);
  });

  it("recusa resultado negativo com 'money-negative-result'", () => {
    assert.deepEqual(Money.subtract(money(1), money(2)), {
      ok: false,
      error: 'money-negative-result',
    });
  });

  it("o tipo do erro é só 'money-negative-result'", () => {
    const typed: Equals<
      ReturnType<typeof Money.subtract>,
      Result<Money.Money, 'money-negative-result'>
    > = true;
    assert.equal(typed, true);
  });
});

describe('Money.equals', () => {
  it('compara por valor: dois objetos distintos com os mesmos centavos são iguais', () => {
    assert.equal(Money.equals(money(10), money(10)), true);
  });

  it('centavos diferentes não são iguais', () => {
    assert.equal(Money.equals(money(10), money(11)), false);
  });

  it('-0 e ZERO são iguais', () => {
    assert.equal(Money.equals(money(-0), Money.ZERO), true);
  });
});

describe('Money.greaterThan', () => {
  it('é verdadeiro quando a tem mais centavos que b', () => {
    assert.equal(Money.greaterThan(money(11), money(10)), true);
  });

  it('é falso quando a e b são iguais (comparação estrita)', () => {
    assert.equal(Money.greaterThan(money(10), money(10)), false);
  });

  it('é falso quando a tem menos centavos que b', () => {
    assert.equal(Money.greaterThan(money(9), money(10)), false);
  });
});
