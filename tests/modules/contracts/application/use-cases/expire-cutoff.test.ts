/**
 * W0 RED — 009-contract-auto-expire (T002). Helper de cutoff no fuso de Brasília (UTC-3).
 * `PlainDate.fromDateAtOffsetMinutes(now, -180)` = data-calendário corrente em BRT.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PlainDate from '#src/shared/kernel/plain-date.ts';

const SAO_PAULO = -180; // UTC-3 fixo

describe('PlainDate.fromDateAtOffsetMinutes — cutoff BRT (UTC-3)', () => {
  it('02:00Z → 2026-06-10 (ainda dia 10 em Brasília, 23:00)', () => {
    const d = PlainDate.fromDateAtOffsetMinutes(new Date('2026-06-11T02:00:00.000Z'), SAO_PAULO);
    assert.equal(PlainDate.toISOString(d), '2026-06-10');
  });

  it('03:00Z (meia-noite BRT) → 2026-06-11', () => {
    const d = PlainDate.fromDateAtOffsetMinutes(new Date('2026-06-11T03:00:00.000Z'), SAO_PAULO);
    assert.equal(PlainDate.toISOString(d), '2026-06-11');
  });

  it('04:00Z → 2026-06-11 (01:00 em Brasília)', () => {
    const d = PlainDate.fromDateAtOffsetMinutes(new Date('2026-06-11T04:00:00.000Z'), SAO_PAULO);
    assert.equal(PlainDate.toISOString(d), '2026-06-11');
  });

  it('offset 0 = comportamento de fromDate (UTC)', () => {
    const d = PlainDate.fromDateAtOffsetMinutes(new Date('2026-06-11T02:00:00.000Z'), 0);
    assert.equal(PlainDate.toISOString(d), '2026-06-11');
  });
});
