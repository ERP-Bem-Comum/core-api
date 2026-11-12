import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

const date = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso);
  assert.ok(r.ok, `data de teste inválida: ${iso}`);
  return r.value;
};

const instant = (d: Date): PlainDate.PlainDate => {
  const r = PlainDate.fromDate(d);
  assert.ok(r.ok, `instante de teste inválido: ${String(d)}`);
  return r.value;
};

const fixed = (startIso: string, endIso: string): Period.Period => {
  const r = Period.create(date(startIso), date(endIso));
  assert.ok(r.ok, `período de teste inválido: ${startIso}..${endIso}`);
  return r.value;
};

describe('Period.create', () => {
  it('cria período Fixed quando o fim é posterior ao início', () => {
    const r = Period.create(date('2026-01-01'), date('2026-12-31'));
    assert.ok(r.ok);
    assert.equal(r.value.kind, 'Fixed');
  });

  it('guarda início e fim como PlainDate (ano, mês, dia), e não como Date', () => {
    const p = fixed('2026-01-01', '2026-12-31');
    assert.equal(p.kind, 'Fixed');
    if (p.kind !== 'Fixed') return;
    assert.ok(!(p.start instanceof Date));
    assert.ok(!(p.end instanceof Date));
    assert.deepEqual({ ...p.start }, { year: 2026, month: 1, day: 1 });
    assert.deepEqual({ ...p.end }, { year: 2026, month: 12, day: 31 });
  });

  it('aceita fim exatamente um dia depois do início', () => {
    const r = Period.create(date('2026-03-10'), date('2026-03-11'));
    assert.ok(r.ok);
  });

  it("recusa fim anterior ao início com 'period-end-before-start'", () => {
    const r = Period.create(date('2026-12-31'), date('2026-01-01'));
    assert.ok(!r.ok);
    assert.equal(r.error, 'period-end-before-start');
  });

  it("recusa início igual ao fim com 'period-zero-duration'", () => {
    const r = Period.create(date('2026-05-05'), date('2026-05-05'));
    assert.ok(!r.ok);
    assert.equal(r.error, 'period-zero-duration');
  });

  it('valida só a ordem e confia no PlainDate recebido: aceita ano anterior a 2000 vindo de fromDate', () => {
    const start = instant(new Date('1999-02-28T00:00:00Z'));
    const end = instant(new Date('1999-03-01T00:00:00Z'));
    assert.equal(PlainDate.from('1999-02-28').ok, false);
    const r = Period.create(start, end);
    assert.ok(r.ok);
    assert.equal(Period.create(end, start).ok, false);
  });

  it('exemplo do TSDoc: dois dias consecutivos vindos de fromDate formam período ok', () => {
    const start = PlainDate.fromDate(new Date('2026-03-10T00:00:00Z'));
    const end = PlainDate.fromDate(new Date('2026-03-11T00:00:00Z'));
    const r = start.ok && end.ok ? Period.create(start.value, end.value) : undefined;
    assert.ok(r?.ok);
  });

  it('devolve um período congelado', () => {
    const p = fixed('2026-01-01', '2026-12-31');
    assert.ok(Object.isFrozen(p));
  });

  it('o tipo Period não aceita objeto literal cru Fixed nem Indefinite', () => {
    const start = date('2026-01-01');
    const end = date('2026-02-01');
    // @ts-expect-error
    const rawFixed: Period.Period = { kind: 'Fixed', start, end };
    // @ts-expect-error
    const rawIndefinite: Period.Period = { kind: 'Indefinite', start };
    assert.equal(Object.isFrozen(rawFixed), false);
    assert.equal(Object.isFrozen(rawIndefinite), false);
  });

  it("Date inválido não forma período: fromDate devolve err('plain-date-invalid-date') antes de create", () => {
    const start = PlainDate.fromDate(new Date('2026-01-10T00:00:00Z'));
    const end = PlainDate.fromDate(new Date(NaN));
    assert.ok(start.ok);
    assert.deepEqual(end, { ok: false, error: 'plain-date-invalid-date' });
  });
});

describe('Period.createIndefinite', () => {
  it('cria período Indefinite só com início, sem fim', () => {
    const p = Period.createIndefinite(date('2026-01-01'));
    assert.equal(p.kind, 'Indefinite');
    assert.ok(!('end' in p));
    assert.ok(PlainDate.equals(p.start, date('2026-01-01')));
  });

  it('devolve um período congelado', () => {
    assert.ok(Object.isFrozen(Period.createIndefinite(date('2026-01-01'))));
  });
});

describe('Period.contains', () => {
  const p = fixed('2026-01-10', '2026-01-20');

  it('inclui um instante no dia de início (faixa inclusiva no início)', () => {
    assert.equal(Period.contains(p, new Date('2026-01-10T00:00:00Z')), true);
  });

  it('inclui um instante no último segundo do dia de fim (faixa inclusiva no fim)', () => {
    assert.equal(Period.contains(p, new Date('2026-01-20T23:59:59.999Z')), true);
  });

  it('inclui um instante no meio da faixa', () => {
    assert.equal(Period.contains(p, new Date('2026-01-15T12:00:00Z')), true);
  });

  it('exclui um instante do dia anterior ao início', () => {
    assert.equal(Period.contains(p, new Date('2026-01-09T23:59:59.999Z')), false);
  });

  it('exclui um instante do dia seguinte ao fim', () => {
    assert.equal(Period.contains(p, new Date('2026-01-21T00:00:00Z')), false);
  });

  it('projeta o instante para a data-calendário UTC, não para a data local', () => {
    const previousTz = process.env['TZ'];
    process.env['TZ'] = 'America/Sao_Paulo';
    try {
      const lateOnEndDayInBrasilia = new Date('2026-01-20T23:30:00-03:00');
      assert.equal(lateOnEndDayInBrasilia.getDate(), 20);
      assert.equal(lateOnEndDayInBrasilia.getUTCDate(), 21);
      assert.equal(Period.contains(p, lateOnEndDayInBrasilia), false);
      const earlyBeforeStartInUtc = new Date('2026-01-10T01:00:00Z');
      assert.equal(earlyBeforeStartInUtc.getDate(), 9);
      assert.equal(Period.contains(p, earlyBeforeStartInUtc), true);
    } finally {
      if (previousTz === undefined) delete process.env['TZ'];
      else process.env['TZ'] = previousTz;
    }
  });

  it('devolve false para Date inválido (NaN)', () => {
    assert.equal(Period.contains(p, new Date('invalid')), false);
    assert.equal(
      Period.contains(Period.createIndefinite(date('2000-01-01')), new Date(NaN)),
      false,
    );
  });

  it('em período Indefinite inclui qualquer instante a partir do início, sem limite superior', () => {
    const open = Period.createIndefinite(date('2026-01-10'));
    assert.equal(Period.contains(open, new Date('2026-01-10T00:00:00Z')), true);
    assert.equal(Period.contains(open, new Date('9999-12-31T23:59:59Z')), true);
  });

  it('em período Indefinite exclui instante anterior ao início', () => {
    const open = Period.createIndefinite(date('2026-01-10'));
    assert.equal(Period.contains(open, new Date('2026-01-09T23:59:59Z')), false);
  });
});

describe('Period.equals', () => {
  it('considera iguais dois Fixed com mesmo início e fim, ainda que instâncias diferentes', () => {
    assert.equal(
      Period.equals(fixed('2026-01-01', '2026-06-30'), fixed('2026-01-01', '2026-06-30')),
      true,
    );
  });

  it('considera diferentes dois Fixed com fins diferentes, nas duas ordens', () => {
    const a = fixed('2026-01-01', '2026-06-30');
    const b = fixed('2026-01-01', '2026-07-01');
    assert.equal(Period.equals(a, b), false);
    assert.equal(Period.equals(b, a), false);
  });

  it('considera diferentes dois Fixed com inícios diferentes, nas duas ordens', () => {
    const a = fixed('2026-01-01', '2026-06-30');
    const b = fixed('2026-01-02', '2026-06-30');
    assert.equal(Period.equals(a, b), false);
    assert.equal(Period.equals(b, a), false);
  });

  it('considera um período igual a si mesmo', () => {
    const p = fixed('2026-01-01', '2026-06-30');
    const open = Period.createIndefinite(date('2026-01-01'));
    assert.equal(Period.equals(p, p), true);
    assert.equal(Period.equals(open, open), true);
  });

  it('considera iguais dois Indefinite com mesmo início', () => {
    assert.equal(
      Period.equals(
        Period.createIndefinite(date('2026-01-01')),
        Period.createIndefinite(date('2026-01-01')),
      ),
      true,
    );
  });

  it('considera diferentes dois Indefinite com inícios diferentes, nas duas ordens', () => {
    const a = Period.createIndefinite(date('2026-01-01'));
    const b = Period.createIndefinite(date('2026-01-02'));
    assert.equal(Period.equals(a, b), false);
    assert.equal(Period.equals(b, a), false);
  });

  it('considera diferentes um Fixed e um Indefinite com o mesmo início', () => {
    const a = fixed('2026-01-01', '2026-06-30');
    const b = Period.createIndefinite(date('2026-01-01'));
    assert.equal(Period.equals(a, b), false);
    assert.equal(Period.equals(b, a), false);
  });
});

describe('Period.isIndefinite', () => {
  it('devolve true para período criado por createIndefinite', () => {
    assert.equal(Period.isIndefinite(Period.createIndefinite(date('2026-01-01'))), true);
  });

  it('devolve false para período criado por create', () => {
    assert.equal(Period.isIndefinite(fixed('2026-01-01', '2026-02-01')), false);
  });
});
