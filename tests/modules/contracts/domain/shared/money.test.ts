import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { Money } from '#src/modules/contracts/domain/shared/money.ts';

describe('Money — fromCents construction', () => {
  it('accepts zero', () => {
    const r = Money.fromCents(0);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 0);
  });

  it('accepts any positive integer', () => {
    const r = Money.fromCents(15050);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 15050);
  });

  it('rejects negative value', () => {
    const r = Money.fromCents(-1);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-negative-value');
  });

  it('rejects non-integer value', () => {
    const r = Money.fromCents(1.5);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-non-integer-value');
  });

  it('rejects NaN', () => {
    const r = Money.fromCents(Number.NaN);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-non-integer-value');
  });

  it('rejects Infinity', () => {
    const r = Money.fromCents(Number.POSITIVE_INFINITY);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-non-integer-value');
  });

  // Defeito #8 — Overflow IEEE 754
  it('accepts Number.MAX_SAFE_INTEGER (inclusive limit)', () => {
    const r = Money.fromCents(Number.MAX_SAFE_INTEGER);
    assert.equal(isOk(r), true);
  });

  it('rejects values above Number.MAX_SAFE_INTEGER (IEEE 754 precision loss)', () => {
    const r = Money.fromCents(Number.MAX_SAFE_INTEGER + 1);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-exceeds-safe-integer');
  });

  it('rejects huge floats like 1e25 (precision already lost)', () => {
    const r = Money.fromCents(1e25);
    assert.equal(isErr(r), true);
    // Pode ser money-exceeds-safe-integer OU money-non-integer-value dependendo da
    // ordem dos checks. Ambos são aceitáveis — o ponto é REJEITAR.
    if (!r.ok) {
      assert.equal(
        r.error === 'money-exceeds-safe-integer' || r.error === 'money-non-integer-value',
        true,
      );
    }
  });
});

describe('Money — zero()', () => {
  it('returns Money with cents = 0', () => {
    const m = Money.zero();
    assert.equal(m.cents, 0);
  });
});

describe('Money — add', () => {
  const c = (n: number) => {
    const r = Money.fromCents(n);
    if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
    return r.value;
  };

  it('adds values correctly', () => {
    const result = Money.add(c(100), c(50));
    assert.equal(result.cents, 150);
  });

  it('is pure — does not mutate arguments', () => {
    const a = c(100);
    const b = c(50);
    Money.add(a, b);
    assert.equal(a.cents, 100);
    assert.equal(b.cents, 50);
  });

  it('is associative', () => {
    const a = c(13);
    const b = c(27);
    const ccc = c(40);
    const left = Money.add(Money.add(a, b), ccc);
    const right = Money.add(a, Money.add(b, ccc));
    assert.equal(left.cents, right.cents);
    assert.equal(left.cents, 80);
  });

  it('has zero as identity', () => {
    const a = c(742);
    const result = Money.add(a, Money.zero());
    assert.equal(result.cents, a.cents);
  });
});

describe('Money — subtract', () => {
  const c = (n: number) => {
    const r = Money.fromCents(n);
    if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
    return r.value;
  };

  it('subtracts when b <= a', () => {
    const r = Money.subtract(c(100), c(30));
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 70);
  });

  it('accepts b equal to a (zero result)', () => {
    const r = Money.subtract(c(100), c(100));
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 0);
  });

  it('rejects when b > a', () => {
    const r = Money.subtract(c(50), c(100));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-negative-result');
  });

  it('subtracting zero is identity', () => {
    const r = Money.subtract(c(742), Money.zero());
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 742);
  });
});

describe('Money — comparisons', () => {
  const c = (n: number) => {
    const r = Money.fromCents(n);
    if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
    return r.value;
  };

  it('equals returns true for equal values', () => {
    assert.equal(Money.equals(c(100), c(100)), true);
  });

  it('equals returns false for different values', () => {
    assert.equal(Money.equals(c(100), c(101)), false);
  });

  it('greaterThan returns true when a > b', () => {
    assert.equal(Money.greaterThan(c(100), c(50)), true);
  });

  it('greaterThan returns false when a < b', () => {
    assert.equal(Money.greaterThan(c(50), c(100)), false);
  });

  it('greaterThan returns false when a = b', () => {
    assert.equal(Money.greaterThan(c(100), c(100)), false);
  });
});
