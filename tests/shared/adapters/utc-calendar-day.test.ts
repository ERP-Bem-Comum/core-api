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

describe('ClockFixed valida o instante na construção', () => {
  it('lança RangeError ao ser construído com Date inválido, antes de qualquer today()', () => {
    assert.throws(() => ClockFixed(new Date('invalid')), RangeError);
  });

  it('today() não relê o instante: mutar o Date depois da construção não muda o dia', () => {
    const at = new Date('2026-05-26T12:00:00.000Z');
    const clock = ClockFixed(at);
    at.setTime(Number.NaN);
    assert.equal(PlainDate.toISOString(clock.today()), '2026-05-26');
  });
});
