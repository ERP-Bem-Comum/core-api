import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import {
  ClockSaoPaulo,
  _todayInSaoPauloForTest,
  todayInSaoPauloAt,
} from '#src/jobs/contracts/sweeper/clock-sao-paulo.ts';

/** Data `YYYY-MM-DD` que `todayInSaoPauloAt` devolve para o instante ISO dado. */
const saoPauloDayOf = (iso: string): string =>
  PlainDate.toISOString(todayInSaoPauloAt(new Date(iso)));

/** Executa `fn` com `process.env.TZ` trocado e restaura o valor anterior ao final. */
const withProcessTimeZone = <T>(tz: string, fn: () => T): T => {
  const previous = process.env['TZ'];
  process.env['TZ'] = tz;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env['TZ'];
    else process.env['TZ'] = previous;
  }
};

/** Instantes fixos e o dia de calendário esperado em America/Sao_Paulo. */
const SAO_PAULO_DAYS: readonly (readonly [string, string])[] = [
  ['2026-06-15T02:59:59Z', '2026-06-14'],
  ['2026-06-15T03:00:00Z', '2026-06-15'],
  ['2026-12-31T23:30:00Z', '2026-12-31'],
  ['2027-01-01T03:00:00Z', '2027-01-01'],
  ['2028-02-29T12:00:00Z', '2028-02-29'],
];

describe('todayInSaoPauloAt', () => {
  for (const [instant, expected] of SAO_PAULO_DAYS) {
    it(`extrai ${expected} de ${instant}`, () => {
      assert.equal(saoPauloDayOf(instant), expected);
    });
  }

  it('usa o dia em São Paulo, não o dia UTC: 02:59:59Z ainda é o dia anterior', () => {
    const instant = new Date('2026-06-15T02:59:59Z');
    const utcDay = PlainDate.fromDate(instant);
    assert.ok(utcDay.ok);
    assert.equal(PlainDate.toISOString(utcDay.value), '2026-06-15');
    assert.equal(PlainDate.toISOString(todayInSaoPauloAt(instant)), '2026-06-14');
  });

  it('contraprova da virada: um milissegundo antes das 03:00Z é o dia anterior, 03:00Z já é o dia', () => {
    assert.equal(saoPauloDayOf('2026-06-15T02:59:59.999Z'), '2026-06-14');
    assert.equal(saoPauloDayOf('2026-06-15T03:00:00.000Z'), '2026-06-15');
  });

  it('todo resultado da tabela é um dia existente, aceito por PlainDate.from', () => {
    for (const [instant] of SAO_PAULO_DAYS) {
      const iso = saoPauloDayOf(instant);
      assert.ok(PlainDate.from(iso).ok, iso);
    }
  });

  it('o resultado é igual ao PlainDate.from da mesma data, campo a campo', () => {
    const from = PlainDate.from('2028-02-29');
    assert.ok(from.ok);
    assert.deepEqual(todayInSaoPauloAt(new Date('2028-02-29T12:00:00Z')), from.value);
  });

  it('devolve um valor congelado', () => {
    assert.ok(Object.isFrozen(todayInSaoPauloAt(new Date('2026-06-15T12:00:00Z'))));
  });

  it('o mesmo resultado qualquer que seja o fuso do processo', () => {
    const instant = new Date('2026-06-15T02:59:59Z');
    for (const tz of ['UTC', 'Asia/Tokyo', 'America/Sao_Paulo', 'Pacific/Kiritimati']) {
      const day = withProcessTimeZone(tz, () => PlainDate.toISOString(todayInSaoPauloAt(instant)));
      assert.equal(day, '2026-06-14', tz);
    }
    withProcessTimeZone('Asia/Tokyo', () => {
      assert.equal(instant.getDate(), 15);
    });
  });

  it('o ano sai sem reinterpretação: o ano 50 continua 50, não vira 1950', () => {
    const d = todayInSaoPauloAt(new Date('0050-06-15T12:00:00Z'));
    assert.equal(d.year, 50);
    assert.equal(PlainDate.toISOString(d), '0050-06-15');
  });

  it('lança RangeError quando o instante é um Date inválido', () => {
    assert.throws(() => todayInSaoPauloAt(new Date('invalid')), RangeError);
    assert.throws(() => todayInSaoPauloAt(new Date(Number.NaN)), RangeError);
  });
});

describe('ClockSaoPaulo', () => {
  it('today() é todayInSaoPauloAt(readNow()) para o mesmo instante injetado', () => {
    for (const [instant, expected] of SAO_PAULO_DAYS) {
      const at = new Date(instant);
      const clock = ClockSaoPaulo(() => at);
      assert.deepEqual(clock.today(), todayInSaoPauloAt(at), instant);
      assert.equal(PlainDate.toISOString(clock.today()), expected, instant);
    }
  });

  it('now() devolve o instante de readNow()', () => {
    const at = new Date('2026-06-15T02:59:59Z');
    assert.equal(ClockSaoPaulo(() => at).now(), at);
  });

  it('today() lê readNow() a cada chamada', () => {
    const instants = [new Date('2026-06-15T02:59:59Z'), new Date('2026-06-15T03:00:00Z')];
    let call = 0;
    const clock = ClockSaoPaulo(() => instants[call++] ?? new Date(Number.NaN));
    assert.equal(PlainDate.toISOString(clock.today()), '2026-06-14');
    assert.equal(PlainDate.toISOString(clock.today()), '2026-06-15');
  });

  it('sem argumento continua construível e expõe now e today como funções', () => {
    const clock = ClockSaoPaulo();
    assert.equal(typeof clock.now, 'function');
    assert.equal(typeof clock.today, 'function');
    assert.equal(typeof _todayInSaoPauloForTest, 'function');
    assert.equal(_todayInSaoPauloForTest.length, 0);
  });
});
