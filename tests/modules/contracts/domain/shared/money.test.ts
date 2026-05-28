import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';

describe('Money — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as Money` (Padrão D smoke)', () => {
    // Arrange — import já ocorre no topo do arquivo
    // Act — observar o namespace
    const ns: Readonly<Record<string, unknown>> = Money;
    // Assert — namespace tem as funções esperadas no top-level (não aninhadas em `Money.Money`)
    assert.equal(typeof ns.fromCents, 'function');
    assert.equal(typeof ns.add, 'function');
    assert.equal(typeof ns.subtract, 'function');
    assert.equal(typeof ns.equals, 'function');
    assert.equal(typeof ns.greaterThan, 'function');
  });

  it("does NOT expose a nested `Money` namespace-object (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = Money;
    // Assert — namespace-objeto legado foi removido
    assert.equal(ns.Money, undefined);
  });
});

describe('Money — ZERO constant (DO B§10 — identidade fixa via `immutable`)', () => {
  it('exposes ZERO as a constant (not a function)', () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = Money;
    // Assert
    assert.notEqual(ns.ZERO, undefined);
    assert.notEqual(typeof ns.ZERO, 'function');
  });

  it('ZERO has cents = 0', () => {
    // Arrange / Act
    const z = Money.ZERO;
    // Assert
    assert.equal(z.cents, 0);
  });

  it('ZERO is frozen (Object.isFrozen === true)', () => {
    // Arrange / Act
    const z = Money.ZERO;
    // Assert
    assert.equal(Object.isFrozen(z), true);
  });

  it("does NOT expose a `zero()` function (DON'T B§10 — identidade como função)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = Money;
    // Assert
    assert.equal(ns.zero, undefined);
  });
});

describe('Money — fromCents construction', () => {
  it('accepts zero', () => {
    // Arrange / Act
    const r = Money.fromCents(0);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 0);
  });

  it('accepts any positive integer', () => {
    // Arrange / Act
    const r = Money.fromCents(15050);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 15050);
  });

  it('rejects negative value', () => {
    // Arrange / Act
    const r = Money.fromCents(-1);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-negative-value');
  });

  it('rejects non-integer value', () => {
    // Arrange / Act
    const r = Money.fromCents(1.5);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-non-integer-value');
  });

  it('rejects NaN', () => {
    // Arrange / Act
    const r = Money.fromCents(Number.NaN);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-non-integer-value');
  });

  it('rejects Infinity', () => {
    // Arrange / Act
    const r = Money.fromCents(Number.POSITIVE_INFINITY);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-non-integer-value');
  });

  // Defeito #8 — Overflow IEEE 754
  it('accepts Number.MAX_SAFE_INTEGER (inclusive limit)', () => {
    // Arrange / Act
    const r = Money.fromCents(Number.MAX_SAFE_INTEGER);
    // Assert
    assert.equal(isOk(r), true);
  });

  it('rejects values above Number.MAX_SAFE_INTEGER (IEEE 754 precision loss)', () => {
    // Arrange / Act
    const r = Money.fromCents(Number.MAX_SAFE_INTEGER + 1);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-exceeds-safe-integer');
  });

  it('rejects huge floats like 1e25 (precision already lost)', () => {
    // Arrange / Act
    const r = Money.fromCents(1e25);
    // Assert — pode ser money-exceeds-safe-integer OU money-non-integer-value
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(
        r.error === 'money-exceeds-safe-integer' || r.error === 'money-non-integer-value',
        true,
      );
    }
  });

  // DO B§10 — objeto retornado pelo smart constructor deve estar congelado
  it('returns a frozen object on success (Object.isFrozen === true)', () => {
    // Arrange / Act
    const r = Money.fromCents(100);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(Object.isFrozen(r.value), true);
  });

  it('frozen object rejects mutation attempts in strict mode', () => {
    // Arrange
    const r = Money.fromCents(100);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const m = r.value;
    // Act / Assert — tentar mutar deve lançar TypeError em strict mode (ESM)
    assert.throws(() => {
      (m as { cents: number }).cents = 999;
    }, TypeError);
  });
});

describe('Money — add', () => {
  const c = (n: number): Money.Money => {
    const r = Money.fromCents(n);
    if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
    return r.value;
  };

  it('adds values correctly', () => {
    // Arrange
    const a = c(100);
    const b = c(50);
    // Act
    const result = Money.add(a, b);
    // Assert
    assert.equal(result.cents, 150);
  });

  it('returns a frozen Money object (DO B§10)', () => {
    // Arrange
    const a = c(100);
    const b = c(50);
    // Act
    const result = Money.add(a, b);
    // Assert
    assert.equal(Object.isFrozen(result), true);
  });

  it('is pure — does not mutate arguments', () => {
    // Arrange
    const a = c(100);
    const b = c(50);
    // Act
    Money.add(a, b);
    // Assert
    assert.equal(a.cents, 100);
    assert.equal(b.cents, 50);
  });

  it('is associative', () => {
    // Arrange
    const a = c(13);
    const b = c(27);
    const ccc = c(40);
    // Act
    const left = Money.add(Money.add(a, b), ccc);
    const right = Money.add(a, Money.add(b, ccc));
    // Assert
    assert.equal(left.cents, right.cents);
    assert.equal(left.cents, 80);
  });

  it('has ZERO as identity', () => {
    // Arrange
    const a = c(742);
    // Act
    const result = Money.add(a, Money.ZERO);
    // Assert
    assert.equal(result.cents, a.cents);
  });
});

describe('Money — subtract', () => {
  const c = (n: number): Money.Money => {
    const r = Money.fromCents(n);
    if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
    return r.value;
  };

  it('subtracts when b <= a', () => {
    // Arrange
    const a = c(100);
    const b = c(30);
    // Act
    const r = Money.subtract(a, b);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 70);
  });

  it('returns a frozen Money object on success (DO B§10)', () => {
    // Arrange
    const a = c(100);
    const b = c(30);
    // Act
    const r = Money.subtract(a, b);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(Object.isFrozen(r.value), true);
  });

  it('accepts b equal to a (zero result)', () => {
    // Arrange
    const a = c(100);
    const b = c(100);
    // Act
    const r = Money.subtract(a, b);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 0);
  });

  it('rejects when b > a', () => {
    // Arrange
    const a = c(50);
    const b = c(100);
    // Act
    const r = Money.subtract(a, b);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-negative-result');
  });

  it('subtracting ZERO is identity', () => {
    // Arrange
    const a = c(742);
    // Act
    const r = Money.subtract(a, Money.ZERO);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.cents, 742);
  });
});

describe('Money — comparisons', () => {
  const c = (n: number): Money.Money => {
    const r = Money.fromCents(n);
    if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
    return r.value;
  };

  it('equals returns true for equal values', () => {
    // Arrange / Act / Assert
    assert.equal(Money.equals(c(100), c(100)), true);
  });

  it('equals returns false for different values', () => {
    // Arrange / Act / Assert
    assert.equal(Money.equals(c(100), c(101)), false);
  });

  it('greaterThan returns true when a > b', () => {
    // Arrange / Act / Assert
    assert.equal(Money.greaterThan(c(100), c(50)), true);
  });

  it('greaterThan returns false when a < b', () => {
    // Arrange / Act / Assert
    assert.equal(Money.greaterThan(c(50), c(100)), false);
  });

  it('greaterThan returns false when a = b', () => {
    // Arrange / Act / Assert
    assert.equal(Money.greaterThan(c(100), c(100)), false);
  });
});
