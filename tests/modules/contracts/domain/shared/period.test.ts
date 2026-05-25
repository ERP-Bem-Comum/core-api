import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Period from '#src/shared/kernel/period.ts';

const D = (iso: string): Date => new Date(iso);
const INVALID = new Date('not-a-date');

const fixed = (startISO: string, endISO: string): Period.Period => {
  const r = Period.create(D(startISO), D(endISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const indefinite = (startISO: string): Period.Period => {
  const r = Period.createIndefinite(D(startISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

describe('Period — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as Period` (Padrão D smoke)', () => {
    // Arrange
    const ns: Readonly<Record<string, unknown>> = Period;
    // Act / Assert — funções no top-level do namespace
    assert.equal(typeof ns.create, 'function');
    assert.equal(typeof ns.createIndefinite, 'function');
    assert.equal(typeof ns.contains, 'function');
    assert.equal(typeof ns.equals, 'function');
    assert.equal(typeof ns.isIndefinite, 'function');
  });

  it("does NOT expose a nested `Period` namespace-object (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = Period;
    // Assert
    assert.equal(ns.Period, undefined);
  });
});

describe('Period — create (Fixed)', () => {
  it('accepts valid start and end', () => {
    // Arrange / Act
    const r = Period.create(D('2026-01-01'), D('2026-12-31'));
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.kind, 'Fixed');
      if (r.value.kind === 'Fixed') {
        assert.equal(r.value.start.getTime(), D('2026-01-01').getTime());
        assert.equal(r.value.end.getTime(), D('2026-12-31').getTime());
      }
    }
  });

  // DO B§10 — objeto retornado pelo smart constructor deve estar congelado
  it('returns a frozen Period object on success (Object.isFrozen === true)', () => {
    // Arrange / Act
    const r = Period.create(D('2026-01-01'), D('2026-12-31'));
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(Object.isFrozen(r.value), true);
  });

  // Defeito #7 — período de 0 instantes deixou de ser aceito.
  it('rejects start === end (zero duration is noop)', () => {
    // Arrange
    const d = D('2026-06-15T12:00:00Z');
    // Act
    const r = Period.create(d, d);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-zero-duration');
  });

  it('rejects start with year < 2000 (Defeito #7)', () => {
    // Arrange / Act
    const r = Period.create(D('0001-01-01'), D('0005-01-01'));
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-year-out-of-range');
  });

  it('rejects end with year < 2000', () => {
    // Arrange / Act
    const r = Period.create(D('1999-01-01'), D('1999-12-31'));
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-year-out-of-range');
  });

  it('rejects end before start', () => {
    // Arrange / Act
    const r = Period.create(D('2026-12-31'), D('2026-01-01'));
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-end-before-start');
  });

  it('rejects invalid start date', () => {
    // Arrange / Act
    const r = Period.create(INVALID, D('2026-12-31'));
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-invalid-start-date');
  });

  it('rejects invalid end date', () => {
    // Arrange / Act
    const r = Period.create(D('2026-01-01'), INVALID);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-invalid-end-date');
  });
});

describe('Period — createIndefinite', () => {
  it('accepts valid start', () => {
    // Arrange / Act
    const r = Period.createIndefinite(D('2026-01-01'));
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.kind, 'Indefinite');
      if (r.value.kind === 'Indefinite') {
        assert.equal(r.value.start.getTime(), D('2026-01-01').getTime());
      }
    }
  });

  // DO B§10 — objeto retornado pelo smart constructor deve estar congelado
  it('returns a frozen Period object on success', () => {
    // Arrange / Act
    const r = Period.createIndefinite(D('2026-01-01'));
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(Object.isFrozen(r.value), true);
  });

  it('rejects invalid start', () => {
    // Arrange / Act
    const r = Period.createIndefinite(INVALID);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-invalid-start-date');
  });

  // Defeito #7 — ano < 2000 rejeitado
  it('rejects start with year < 2000', () => {
    // Arrange / Act
    const r = Period.createIndefinite(D('0001-01-01'));
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-year-out-of-range');
  });
});

describe('Period — contains (Fixed)', () => {
  const p = fixed('2026-01-01', '2026-12-31');

  it('returns true for instant inside the range', () => {
    // Arrange / Act / Assert
    assert.equal(Period.contains(p, D('2026-06-15')), true);
  });

  it('returns true for instant equal to start (inclusive)', () => {
    // Arrange / Act / Assert
    assert.equal(Period.contains(p, D('2026-01-01')), true);
  });

  it('returns true for instant equal to end (inclusive)', () => {
    // Arrange / Act / Assert
    assert.equal(Period.contains(p, D('2026-12-31')), true);
  });

  it('returns false for instant before start', () => {
    // Arrange / Act / Assert
    assert.equal(Period.contains(p, D('2025-12-31')), false);
  });

  it('returns false for instant after end', () => {
    // Arrange / Act / Assert
    assert.equal(Period.contains(p, D('2027-01-01')), false);
  });
});

describe('Period — contains (Indefinite)', () => {
  const p = indefinite('2026-01-01');

  it('returns true for instant after start', () => {
    // Arrange / Act / Assert
    assert.equal(Period.contains(p, D('2099-12-31')), true);
  });

  it('returns true for instant equal to start (inclusive)', () => {
    // Arrange / Act / Assert
    assert.equal(Period.contains(p, D('2026-01-01')), true);
  });

  it('returns false for instant before start', () => {
    // Arrange / Act / Assert
    assert.equal(Period.contains(p, D('2025-12-31')), false);
  });
});

describe('Period — contains (invalid instant)', () => {
  it('returns false for NaN date — Fixed period', () => {
    // Arrange
    const p = fixed('2026-01-01', '2026-12-31');
    // Act / Assert
    assert.equal(Period.contains(p, INVALID), false);
  });

  it('returns false for NaN date — Indefinite period', () => {
    // Arrange
    const p = indefinite('2026-01-01');
    // Act / Assert
    assert.equal(Period.contains(p, INVALID), false);
  });
});

describe('Period — equals', () => {
  it('returns true for two Fixed periods with same start and end', () => {
    // Arrange
    const a = fixed('2026-01-01', '2026-12-31');
    const b = fixed('2026-01-01', '2026-12-31');
    // Act / Assert
    assert.equal(Period.equals(a, b), true);
  });

  it('returns false when starts differ', () => {
    // Arrange
    const a = fixed('2026-01-01', '2026-12-31');
    const b = fixed('2026-01-02', '2026-12-31');
    // Act / Assert
    assert.equal(Period.equals(a, b), false);
  });

  it('returns false when ends differ', () => {
    // Arrange
    const a = fixed('2026-01-01', '2026-12-31');
    const b = fixed('2026-01-01', '2026-12-30');
    // Act / Assert
    assert.equal(Period.equals(a, b), false);
  });

  it('returns true for two Indefinite periods with same start', () => {
    // Arrange
    const a = indefinite('2026-01-01');
    const b = indefinite('2026-01-01');
    // Act / Assert
    assert.equal(Period.equals(a, b), true);
  });

  it('returns false for Indefinite with different starts', () => {
    // Arrange
    const a = indefinite('2026-01-01');
    const b = indefinite('2026-02-01');
    // Act / Assert
    assert.equal(Period.equals(a, b), false);
  });

  it('returns false comparing Fixed with Indefinite', () => {
    // Arrange
    const a = fixed('2026-01-01', '2026-12-31');
    const b = indefinite('2026-01-01');
    // Act / Assert
    assert.equal(Period.equals(a, b), false);
  });
});

describe('Period — isIndefinite', () => {
  it('returns false for Fixed', () => {
    // Arrange
    const p = fixed('2026-01-01', '2026-12-31');
    // Act / Assert
    assert.equal(Period.isIndefinite(p), false);
  });

  it('returns true for Indefinite', () => {
    // Arrange
    const p = indefinite('2026-01-01');
    // Act / Assert
    assert.equal(Period.isIndefinite(p), true);
  });
});
