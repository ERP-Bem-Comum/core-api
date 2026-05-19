import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { Period } from '#src/modules/contracts/domain/shared/period.ts';

const D = (iso: string): Date => new Date(iso);
const INVALID = new Date('not-a-date');

const fixed = (startISO: string, endISO: string) => {
  const r = Period.create(D(startISO), D(endISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const indefinite = (startISO: string) => {
  const r = Period.createIndefinite(D(startISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

describe('Period — create (Fixed)', () => {
  it('accepts valid start and end', () => {
    const r = Period.create(D('2026-01-01'), D('2026-12-31'));
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.kind, 'Fixed');
      if (r.value.kind === 'Fixed') {
        assert.equal(r.value.start.getTime(), D('2026-01-01').getTime());
        assert.equal(r.value.end.getTime(), D('2026-12-31').getTime());
      }
    }
  });

  // Defeito #7 — período de 0 instantes deixou de ser aceito.
  it('rejects start === end (zero duration is noop)', () => {
    const d = D('2026-06-15T12:00:00Z');
    const r = Period.create(d, d);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-zero-duration');
  });

  it('rejects start with year < 2000 (Defeito #7)', () => {
    const r = Period.create(D('0001-01-01'), D('0005-01-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-year-out-of-range');
  });

  it('rejects end with year < 2000', () => {
    const r = Period.create(D('1999-01-01'), D('1999-12-31'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-year-out-of-range');
  });

  it('rejects end before start', () => {
    const r = Period.create(D('2026-12-31'), D('2026-01-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-end-before-start');
  });

  it('rejects invalid start date', () => {
    const r = Period.create(INVALID, D('2026-12-31'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-invalid-start-date');
  });

  it('rejects invalid end date', () => {
    const r = Period.create(D('2026-01-01'), INVALID);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-invalid-end-date');
  });
});

describe('Period — createIndefinite', () => {
  it('accepts valid start', () => {
    const r = Period.createIndefinite(D('2026-01-01'));
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.kind, 'Indefinite');
      if (r.value.kind === 'Indefinite') {
        assert.equal(r.value.start.getTime(), D('2026-01-01').getTime());
      }
    }
  });

  it('rejects invalid start', () => {
    const r = Period.createIndefinite(INVALID);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-invalid-start-date');
  });

  // Defeito #7 — ano < 2000 rejeitado
  it('rejects start with year < 2000', () => {
    const r = Period.createIndefinite(D('0001-01-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-year-out-of-range');
  });
});

describe('Period — contains (Fixed)', () => {
  const p = fixed('2026-01-01', '2026-12-31');

  it('returns true for instant inside the range', () => {
    assert.equal(Period.contains(p, D('2026-06-15')), true);
  });

  it('returns true for instant equal to start (inclusive)', () => {
    assert.equal(Period.contains(p, D('2026-01-01')), true);
  });

  it('returns true for instant equal to end (inclusive)', () => {
    assert.equal(Period.contains(p, D('2026-12-31')), true);
  });

  it('returns false for instant before start', () => {
    assert.equal(Period.contains(p, D('2025-12-31')), false);
  });

  it('returns false for instant after end', () => {
    assert.equal(Period.contains(p, D('2027-01-01')), false);
  });
});

describe('Period — contains (Indefinite)', () => {
  const p = indefinite('2026-01-01');

  it('returns true for instant after start', () => {
    assert.equal(Period.contains(p, D('2099-12-31')), true);
  });

  it('returns true for instant equal to start (inclusive)', () => {
    assert.equal(Period.contains(p, D('2026-01-01')), true);
  });

  it('returns false for instant before start', () => {
    assert.equal(Period.contains(p, D('2025-12-31')), false);
  });
});

describe('Period — contains (invalid instant)', () => {
  it('returns false for NaN date — Fixed period', () => {
    const p = fixed('2026-01-01', '2026-12-31');
    assert.equal(Period.contains(p, INVALID), false);
  });

  it('returns false for NaN date — Indefinite period', () => {
    const p = indefinite('2026-01-01');
    assert.equal(Period.contains(p, INVALID), false);
  });
});

describe('Period — equals', () => {
  it('returns true for two Fixed periods with same start and end', () => {
    const a = fixed('2026-01-01', '2026-12-31');
    const b = fixed('2026-01-01', '2026-12-31');
    assert.equal(Period.equals(a, b), true);
  });

  it('returns false when starts differ', () => {
    const a = fixed('2026-01-01', '2026-12-31');
    const b = fixed('2026-01-02', '2026-12-31');
    assert.equal(Period.equals(a, b), false);
  });

  it('returns false when ends differ', () => {
    const a = fixed('2026-01-01', '2026-12-31');
    const b = fixed('2026-01-01', '2026-12-30');
    assert.equal(Period.equals(a, b), false);
  });

  it('returns true for two Indefinite periods with same start', () => {
    const a = indefinite('2026-01-01');
    const b = indefinite('2026-01-01');
    assert.equal(Period.equals(a, b), true);
  });

  it('returns false for Indefinite with different starts', () => {
    const a = indefinite('2026-01-01');
    const b = indefinite('2026-02-01');
    assert.equal(Period.equals(a, b), false);
  });

  it('returns false comparing Fixed with Indefinite', () => {
    const a = fixed('2026-01-01', '2026-12-31');
    const b = indefinite('2026-01-01');
    assert.equal(Period.equals(a, b), false);
  });
});

describe('Period — isIndefinite', () => {
  it('returns false for Fixed', () => {
    const p = fixed('2026-01-01', '2026-12-31');
    assert.equal(Period.isIndefinite(p), false);
  });

  it('returns true for Indefinite', () => {
    const p = indefinite('2026-01-01');
    assert.equal(Period.isIndefinite(p), true);
  });
});
