/**
 * CTR-VO-PLAIN-DATE — W0 (RED) — Clock.today()
 *
 * Cobre CA5. RED até `today` existir no port e nos adapters.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

describe('Clock.today', () => {
  it('CA5: ClockFixed deriva o PlainDate UTC do instante fixo', () => {
    const clock = ClockFixed(new Date('2026-05-26T23:30:00.000Z'));
    assert.equal(PlainDate.toISOString(clock.today()), '2026-05-26');
  });

  it('CA5: ClockReal retorna um PlainDate válido (ano ≥ 2000)', () => {
    const today = ClockReal().today();
    assert.ok(today.year >= 2000);
    assert.ok(today.month >= 1 && today.month <= 12);
    assert.ok(today.day >= 1 && today.day <= 31);
  });
});
