import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

// Após CTR-PERIOD-PLAIN-DATE, `Period` opera sobre `PlainDate` (data-calendário).
// Validade da data e range de ano são responsabilidade do VO `PlainDate`
// (ver tests/shared/kernel/plain-date.test.ts) — aqui só testamos ordem + semântica.
const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso);
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const fixed = (startISO: string, endISO: string): Period.Period => {
  const r = Period.create(pd(startISO), pd(endISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const indefinite = (startISO: string): Period.Period => Period.createIndefinite(pd(startISO));

describe('Period — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as Period` (Padrão D smoke)', () => {
    const ns: Readonly<Record<string, unknown>> = Period;
    assert.equal(typeof ns.create, 'function');
    assert.equal(typeof ns.createIndefinite, 'function');
    assert.equal(typeof ns.contains, 'function');
    assert.equal(typeof ns.equals, 'function');
    assert.equal(typeof ns.isIndefinite, 'function');
  });

  it("does NOT expose a nested `Period` namespace-object (DON'T B§7)", () => {
    const ns: Readonly<Record<string, unknown>> = Period;
    assert.equal(ns.Period, undefined);
  });
});

describe('Period — create (Fixed)', () => {
  it('accepts valid start and end (PlainDate)', () => {
    const r = Period.create(pd('2026-01-01'), pd('2026-12-31'));
    assert.equal(isOk(r), true);
    if (r.ok && r.value.kind === 'Fixed') {
      assert.equal(PlainDate.equals(r.value.start, pd('2026-01-01')), true);
      assert.equal(PlainDate.equals(r.value.end, pd('2026-12-31')), true);
    }
  });

  // DO B§10 — objeto retornado pelo smart constructor deve estar congelado
  it('returns a frozen Period object on success (Object.isFrozen === true)', () => {
    const r = Period.create(pd('2026-01-01'), pd('2026-12-31'));
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(Object.isFrozen(r.value), true);
  });

  // Defeito #7 — período de 0 dias deixou de ser aceito.
  it('rejects start === end (zero duration is noop)', () => {
    const r = Period.create(pd('2026-06-15'), pd('2026-06-15'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-zero-duration');
  });

  it('rejects end before start', () => {
    const r = Period.create(pd('2026-12-31'), pd('2026-01-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-end-before-start');
  });
});

describe('Period — createIndefinite', () => {
  it('produces an Indefinite period from a valid start', () => {
    const p = Period.createIndefinite(pd('2026-01-01'));
    assert.equal(p.kind, 'Indefinite');
    if (p.kind === 'Indefinite') assert.equal(PlainDate.equals(p.start, pd('2026-01-01')), true);
  });

  it('returns a frozen Period object', () => {
    const p = Period.createIndefinite(pd('2026-01-01'));
    assert.equal(Object.isFrozen(p), true);
  });
});

describe('Period — contains (Fixed)', () => {
  const p = fixed('2026-01-01', '2026-12-31');

  it('returns true for instant inside the range', () => {
    assert.equal(Period.contains(p, new Date('2026-06-15T00:00:00Z')), true);
  });

  it('ignores time-of-day — any instant on the end date is still contained', () => {
    assert.equal(Period.contains(p, new Date('2026-12-31T23:59:59Z')), true);
  });

  it('returns true for instant equal to start (inclusive)', () => {
    assert.equal(Period.contains(p, new Date('2026-01-01T00:00:00Z')), true);
  });

  it('returns false for instant before start', () => {
    assert.equal(Period.contains(p, new Date('2025-12-31T00:00:00Z')), false);
  });

  it('returns false for instant after end', () => {
    assert.equal(Period.contains(p, new Date('2027-01-01T00:00:00Z')), false);
  });
});

describe('Period — contains (Indefinite)', () => {
  const p = indefinite('2026-01-01');

  it('returns true for instant after start', () => {
    assert.equal(Period.contains(p, new Date('2099-12-31T00:00:00Z')), true);
  });

  it('returns true for instant equal to start (inclusive)', () => {
    assert.equal(Period.contains(p, new Date('2026-01-01T00:00:00Z')), true);
  });

  it('returns false for instant before start', () => {
    assert.equal(Period.contains(p, new Date('2025-12-31T00:00:00Z')), false);
  });
});

describe('Period — contains (invalid instant)', () => {
  it('returns false for NaN date — Fixed period', () => {
    assert.equal(Period.contains(fixed('2026-01-01', '2026-12-31'), new Date('not-a-date')), false);
  });

  it('returns false for NaN date — Indefinite period', () => {
    assert.equal(Period.contains(indefinite('2026-01-01'), new Date('not-a-date')), false);
  });
});

describe('Period — equals', () => {
  it('returns true for two Fixed periods with same start and end', () => {
    assert.equal(
      Period.equals(fixed('2026-01-01', '2026-12-31'), fixed('2026-01-01', '2026-12-31')),
      true,
    );
  });

  it('returns false when starts differ', () => {
    assert.equal(
      Period.equals(fixed('2026-01-01', '2026-12-31'), fixed('2026-01-02', '2026-12-31')),
      false,
    );
  });

  it('returns false when ends differ', () => {
    assert.equal(
      Period.equals(fixed('2026-01-01', '2026-12-31'), fixed('2026-01-01', '2026-12-30')),
      false,
    );
  });

  it('returns true for two Indefinite periods with same start', () => {
    assert.equal(Period.equals(indefinite('2026-01-01'), indefinite('2026-01-01')), true);
  });

  it('returns false for Indefinite with different starts', () => {
    assert.equal(Period.equals(indefinite('2026-01-01'), indefinite('2026-02-01')), false);
  });

  it('returns false comparing Fixed with Indefinite', () => {
    assert.equal(Period.equals(fixed('2026-01-01', '2026-12-31'), indefinite('2026-01-01')), false);
  });
});

describe('Period — isIndefinite', () => {
  it('returns false for Fixed', () => {
    assert.equal(Period.isIndefinite(fixed('2026-01-01', '2026-12-31')), false);
  });

  it('returns true for Indefinite', () => {
    assert.equal(Period.isIndefinite(indefinite('2026-01-01')), true);
  });
});
