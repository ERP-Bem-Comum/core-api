import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { utcCalendarDayOf } from '#src/shared/adapters/utc-calendar-day.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

describe('utcCalendarDayOf', () => {
  it('devolve o PlainDate do dia UTC do instante', () => {
    assert.equal(
      PlainDate.toISOString(utcCalendarDayOf(new Date('2026-05-26T23:30:00.000Z'))),
      '2026-05-26',
    );
  });

  it('lança RangeError quando o instante é um Date inválido', () => {
    assert.throws(() => utcCalendarDayOf(new Date('invalid')), RangeError);
    assert.throws(() => utcCalendarDayOf(new Date(Number.NaN)), RangeError);
  });
});

describe('ClockFixed com Date inválido', () => {
  it('today() lança RangeError em vez de devolver PlainDate com campos NaN', () => {
    assert.throws(() => ClockFixed(new Date('invalid')).today(), RangeError);
  });

  it('now() segue devolvendo o instante fixado', () => {
    const at = new Date('invalid');
    assert.equal(ClockFixed(at).now(), at);
  });
});
