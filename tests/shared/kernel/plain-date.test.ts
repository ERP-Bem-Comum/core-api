/**
 * CTR-VO-PLAIN-DATE — W0 (RED)
 *
 * Cobre CA1–CA4 do ticket.
 *
 * Estado W0: RED — `src/shared/kernel/plain-date.ts` não existe →
 *   import falha com ERR_MODULE_NOT_FOUND.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PlainDate from '#src/shared/kernel/plain-date.ts';

describe('PlainDate.from', () => {
  it('CA1: parseia YYYY-MM-DD válido', () => {
    const r = PlainDate.from('2026-05-26');
    assert.ok(r.ok);
    assert.deepEqual(
      { year: r.value.year, month: r.value.month, day: r.value.day },
      {
        year: 2026,
        month: 5,
        day: 26,
      },
    );
  });

  it('CA1: toISOString faz round-trip idêntico (zero-padded)', () => {
    const r = PlainDate.from('2026-01-02');
    assert.ok(r.ok);
    assert.equal(PlainDate.toISOString(r.value), '2026-01-02');
  });

  it('CA2: rejeita formato malformado', () => {
    for (const bad of ['2026/05/26', 'x', '2026-5-26', '26-05-2026', '']) {
      const r = PlainDate.from(bad);
      assert.ok(!r.ok, `esperava erro para ${JSON.stringify(bad)}`);
      assert.equal(r.error, 'plain-date-malformed');
    }
  });

  it('CA2: rejeita data impossível', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-05-00']) {
      const r = PlainDate.from(bad);
      assert.ok(!r.ok, `esperava erro para ${bad}`);
      assert.equal(r.error, 'plain-date-out-of-range');
    }
  });

  it('CA2: rejeita ano < 2000', () => {
    const r = PlainDate.from('1999-12-31');
    assert.ok(!r.ok);
    assert.equal(r.error, 'plain-date-year-out-of-range');
  });
});

describe('PlainDate.compare / equals', () => {
  const mk = (s: string): PlainDate.PlainDate => {
    const r = PlainDate.from(s);
    assert.ok(r.ok);
    return r.value;
  };

  it('CA3: ordena por ano, mês, dia', () => {
    assert.equal(PlainDate.compare(mk('2026-05-26'), mk('2027-01-01')), -1);
    assert.equal(PlainDate.compare(mk('2026-06-01'), mk('2026-05-31')), 1);
    assert.equal(PlainDate.compare(mk('2026-05-26'), mk('2026-05-26')), 0);
  });

  it('CA3: isBefore / isAfter / equals', () => {
    const a = mk('2026-05-26');
    const b = mk('2026-05-27');
    assert.ok(PlainDate.isBefore(a, b));
    assert.ok(PlainDate.isAfter(b, a));
    assert.ok(PlainDate.equals(a, mk('2026-05-26')));
    assert.ok(!PlainDate.equals(a, b));
  });
});

describe('PlainDate.fromDate', () => {
  it('CA3: extrai campos de calendário UTC de um instante', () => {
    // 2026-05-26T23:30:00Z — qualquer hora do dia mapeia para a mesma data UTC
    const d = new Date('2026-05-26T23:30:00.000Z');
    const pd = PlainDate.fromDate(d);
    assert.equal(PlainDate.toISOString(pd), '2026-05-26');
  });
});

describe('PlainDate imutabilidade', () => {
  it('CA4: o VO é congelado', () => {
    const r = PlainDate.from('2026-05-26');
    assert.ok(r.ok);
    assert.ok(Object.isFrozen(r.value));
  });
});
