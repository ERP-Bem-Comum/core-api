import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';

import type { BrandOf } from '#src/shared/primitives/brand.ts';
import { ok } from '#src/shared/primitives/result.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

/** Igualdade de tipos em tempo de compilação. */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Igualdade de tipos em tempo de compilação que também distingue o modificador `readonly`. */
type StrictEquals<A, B> =
  (<G>(probe: G) => G extends A ? 1 : 2) extends <G>(probe: G) => G extends B ? 1 : 2
    ? true
    : false;

/** Campos de calendário mutáveis e sem marca. */
interface CalendarFields {
  /** Ano. */
  year: number;
  /** Mês. */
  month: number;
  /** Dia. */
  day: number;
}

/** Constrói um `PlainDate` por `from`, falhando o teste se a string for recusada. */
const mk = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso);
  assert.ok(r.ok, `esperava sucesso para ${JSON.stringify(iso)}`);
  return r.value;
};

/** Devolve o erro de `from`, falhando o teste se a string for aceita. */
const errorOf = (iso: string): PlainDate.PlainDateError => {
  const r = PlainDate.from(iso);
  assert.ok(!r.ok, `esperava erro para ${JSON.stringify(iso)}`);
  return r.error;
};

/** Campos de calendário de um `PlainDate` como objeto simples. */
const fields = (d: PlainDate.PlainDate): { year: number; month: number; day: number } => ({
  year: d.year,
  month: d.month,
  day: d.day,
});

describe('PlainDate — tipo', () => {
  it('PlainDate carrega a marca "PlainDate"', () => {
    const brandIsPlainDate: Equals<BrandOf<PlainDate.PlainDate>, 'PlainDate'> = true;
    assert.equal(brandIsPlainDate, true);
  });

  it('objeto literal { year, month, day } sem marca não é aceito como PlainDate', () => {
    const unbrandedIsAssignable: CalendarFields extends PlainDate.PlainDate ? true : false = false;
    assert.equal(unbrandedIsAssignable, false);
  });

  it('os campos year, month e day são somente-leitura no tipo e congelados em runtime', () => {
    const readonlyFields: StrictEquals<
      Pick<PlainDate.PlainDate, 'year' | 'month' | 'day'>,
      Readonly<CalendarFields>
    > = true;
    assert.equal(readonlyFields, true);
    const d = mk('2026-05-26');
    assert.throws(() => Object.defineProperty(d, 'year', { value: 2027 }), TypeError);
    assert.equal(d.year, 2026);
  });

  it('PlainDateError é exatamente a união das três strings kebab-case', () => {
    const exact: Equals<
      PlainDate.PlainDateError,
      'plain-date-malformed' | 'plain-date-out-of-range' | 'plain-date-year-out-of-range'
    > = true;
    assert.equal(exact, true);
  });

  it('o valor tem apenas as chaves year, month e day, sem hora nem fuso', () => {
    assert.deepEqual(Object.keys(mk('2026-05-26')).sort(), ['day', 'month', 'year']);
  });

  it('o mês de janeiro vale 1', () => {
    assert.equal(mk('2026-01-15').month, 1);
  });
});

describe('PlainDate.from', () => {
  it('parseia YYYY-MM-DD válido em year, month e day numéricos', () => {
    assert.deepEqual(fields(mk('2026-05-26')), { year: 2026, month: 5, day: 26 });
  });

  it('devolve um valor congelado', () => {
    assert.ok(Object.isFrozen(mk('2026-05-26')));
  });

  it('recusa com plain-date-malformed o que não é exatamente YYYY-MM-DD', () => {
    for (const bad of [
      '2026/05/26',
      'x',
      '2026-5-26',
      '26-05-2026',
      '',
      '2026-05-26T00:00:00Z',
      ' 2026-05-26',
      '2026-05-26\n',
      '+2026-05-26',
      '12026-05-26',
    ]) {
      assert.equal(errorOf(bad), 'plain-date-malformed', JSON.stringify(bad));
    }
  });

  it('recusa com plain-date-malformed dígitos não-ASCII', () => {
    assert.equal(errorOf('٢٠٢٦-05-26'), 'plain-date-malformed');
  });

  it('recusa com plain-date-out-of-range mês ou dia inexistente no calendário', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-05-00', '2026-04-31']) {
      assert.equal(errorOf(bad), 'plain-date-out-of-range', bad);
    }
  });

  it('aceita 29 de fevereiro só em ano bissexto', () => {
    assert.deepEqual(fields(mk('2024-02-29')), { year: 2024, month: 2, day: 29 });
    assert.deepEqual(fields(mk('2000-02-29')), { year: 2000, month: 2, day: 29 });
    assert.equal(errorOf('2026-02-29'), 'plain-date-out-of-range');
    assert.equal(errorOf('2100-02-29'), 'plain-date-out-of-range');
  });

  it('recusa com plain-date-year-out-of-range ano anterior a 2000', () => {
    assert.equal(errorOf('1999-12-31'), 'plain-date-year-out-of-range');
    assert.equal(errorOf('0001-01-01'), 'plain-date-year-out-of-range');
  });

  it('aceita 2000-01-01, o primeiro dia do menor ano permitido', () => {
    assert.deepEqual(fields(mk('2000-01-01')), { year: 2000, month: 1, day: 1 });
  });

  it('aceita 9999-12-31, a maior data de quatro dígitos', () => {
    assert.deepEqual(fields(mk('9999-12-31')), { year: 9999, month: 12, day: 31 });
  });

  it('checa o ano antes do calendário: 1999-02-30 dá plain-date-year-out-of-range', () => {
    assert.equal(errorOf('1999-02-30'), 'plain-date-year-out-of-range');
  });

  it('exemplo do TSDoc: from("2026-05-26") é ok do fromDate da meia-noite UTC do mesmo dia', () => {
    assert.deepEqual(
      PlainDate.from('2026-05-26'),
      ok(PlainDate.fromDate(new Date('2026-05-26T00:00:00Z'))),
    );
  });
});

describe('PlainDate — superfície pública sem factory que recebe ano, mês e dia soltos', () => {
  it("'fromParts' não existe no namespace do módulo", () => {
    assert.equal('fromParts' in PlainDate, false);
  });

  it('o namespace expõe exatamente compare, equals, from, fromDate, isAfter, isBefore e toISOString', () => {
    assert.deepEqual(Object.keys(PlainDate).sort(), [
      'compare',
      'equals',
      'from',
      'fromDate',
      'isAfter',
      'isBefore',
      'toISOString',
    ]);
  });

  it('fromDate de um instante de 30 de fevereiro devolve dia existente, que from aceita', () => {
    const d = PlainDate.fromDate(new Date(Date.UTC(2026, 1, 30)));
    assert.deepEqual(PlainDate.from(PlainDate.toISOString(d)), ok(d));
  });
});

describe('PlainDate.fromDate', () => {
  it('devolve um valor congelado', () => {
    assert.ok(Object.isFrozen(PlainDate.fromDate(new Date('2026-05-26T12:00:00Z'))));
  });

  it('normaliza pelo Date: Date.UTC de 30 de fevereiro vira 2 de março, um dia existente', () => {
    const d = PlainDate.fromDate(new Date(Date.UTC(2026, 1, 30)));
    assert.equal(PlainDate.toISOString(d), '2026-03-02');
    assert.ok(PlainDate.from(PlainDate.toISOString(d)).ok);
  });

  it('extrai os campos de calendário UTC do instante', () => {
    assert.equal(
      PlainDate.toISOString(PlainDate.fromDate(new Date('2026-05-26T23:30:00.000Z'))),
      '2026-05-26',
    );
  });

  it('usa a data em UTC, não a do fuso do instante escrito', () => {
    assert.equal(
      PlainDate.toISOString(PlainDate.fromDate(new Date('2026-05-27T00:30:00.000+03:00'))),
      '2026-05-26',
    );
    assert.equal(
      PlainDate.toISOString(PlainDate.fromDate(new Date('2026-05-26T22:00:00.000-03:00'))),
      '2026-05-27',
    );
  });

  it('converte o mês de base zero do Date para mês de 1 a 12', () => {
    assert.equal(PlainDate.fromDate(new Date('2026-01-15T12:00:00Z')).month, 1);
    assert.equal(PlainDate.fromDate(new Date('2026-12-15T12:00:00Z')).month, 12);
  });

  it('não aplica o limite de ano 2000', () => {
    assert.equal(PlainDate.fromDate(new Date('1990-06-01T00:00:00Z')).year, 1990);
  });

  it('com Date inválido produz campos NaN', () => {
    const d = PlainDate.fromDate(new Date('invalid'));
    assert.ok(Number.isNaN(d.year) && Number.isNaN(d.month) && Number.isNaN(d.day));
  });

  it('é o que ClockFixed.today devolve para o instante fixado', () => {
    const at = new Date('2026-05-26T23:30:00.000Z');
    assert.ok(PlainDate.equals(ClockFixed(at).today(), PlainDate.fromDate(at)));
  });

  it('é o que ClockReal.today devolve, com o relógio do Date congelado num instante fixo', () => {
    const at = new Date('2026-05-26T23:30:00.000Z');
    mock.timers.enable({ apis: ['Date'], now: at });
    try {
      assert.deepEqual(ClockReal().today(), PlainDate.fromDate(at));
      assert.equal(PlainDate.toISOString(ClockReal().today()), '2026-05-26');
    } finally {
      mock.timers.reset();
    }
  });
});

describe('PlainDate.compare', () => {
  it('devolve -1 quando a vem antes de b', () => {
    assert.equal(PlainDate.compare(mk('2026-05-26'), mk('2027-01-01')), -1);
  });

  it('devolve 1 quando a vem depois de b', () => {
    assert.equal(PlainDate.compare(mk('2026-06-01'), mk('2026-05-31')), 1);
  });

  it('devolve 0 quando as datas são iguais', () => {
    assert.equal(PlainDate.compare(mk('2026-05-26'), mk('2026-05-26')), 0);
  });

  it('ordena por ano, depois mês, depois dia', () => {
    assert.equal(PlainDate.compare(mk('2026-12-31'), mk('2027-01-01')), -1);
    assert.equal(PlainDate.compare(mk('2026-05-31'), mk('2026-06-01')), -1);
    assert.equal(PlainDate.compare(mk('2026-05-25'), mk('2026-05-26')), -1);
  });

  it('serve de comparador para Array.prototype.sort em ordem cronológica', () => {
    const sorted = [mk('2027-01-01'), mk('2026-05-26'), mk('2026-05-25')]
      .sort(PlainDate.compare)
      .map(PlainDate.toISOString);
    assert.deepEqual(sorted, ['2026-05-25', '2026-05-26', '2027-01-01']);
  });

  it('devolve 1 quando algum campo é NaN, inclusive de uma data consigo mesma', () => {
    const nan = PlainDate.fromDate(new Date('invalid'));
    assert.equal(PlainDate.compare(nan, nan), 1);
    assert.equal(PlainDate.compare(mk('2026-05-26'), nan), 1);
  });
});

describe('PlainDate.isBefore / isAfter / equals', () => {
  it('isBefore é verdadeiro só quando a vem estritamente antes de b', () => {
    assert.ok(PlainDate.isBefore(mk('2026-05-26'), mk('2026-05-27')));
    assert.ok(!PlainDate.isBefore(mk('2026-05-26'), mk('2026-05-26')));
    assert.ok(!PlainDate.isBefore(mk('2026-05-27'), mk('2026-05-26')));
  });

  it('isAfter é verdadeiro só quando a vem estritamente depois de b', () => {
    assert.ok(PlainDate.isAfter(mk('2026-05-27'), mk('2026-05-26')));
    assert.ok(!PlainDate.isAfter(mk('2026-05-26'), mk('2026-05-26')));
    assert.ok(!PlainDate.isAfter(mk('2026-05-26'), mk('2026-05-27')));
  });

  it('equals compara por valor, não por referência', () => {
    const a = mk('2026-05-26');
    const b = mk('2026-05-26');
    assert.notEqual(a, b);
    assert.ok(PlainDate.equals(a, b));
    assert.ok(!PlainDate.equals(a, mk('2026-05-27')));
  });

  it('com campos NaN, isAfter é verdadeiro e isBefore e equals são falsos, mesmo com a mesma data', () => {
    const nan = PlainDate.fromDate(new Date('invalid'));
    assert.ok(PlainDate.isAfter(nan, nan));
    assert.ok(!PlainDate.isBefore(nan, nan));
    assert.ok(!PlainDate.equals(nan, nan));
    assert.ok(!PlainDate.isBefore(mk('2026-05-26'), nan));
    assert.ok(PlainDate.isAfter(mk('2026-05-26'), nan));
  });
});

describe('PlainDate.toISOString', () => {
  it('formata YYYY-MM-DD com mês e dia em dois dígitos', () => {
    assert.equal(PlainDate.toISOString(mk('2026-01-02')), '2026-01-02');
  });

  it('faz round-trip com from', () => {
    for (const iso of ['2000-01-01', '2024-02-29', '2026-12-31', '9999-12-31']) {
      assert.equal(PlainDate.toISOString(mk(iso)), iso);
    }
  });

  it('completa o ano com zeros à esquerda até quatro dígitos', () => {
    assert.equal(
      PlainDate.toISOString(PlainDate.fromDate(new Date('0999-01-01T00:00:00Z'))),
      '0999-01-01',
    );
  });

  it('não trunca ano com mais de quatro dígitos', () => {
    assert.equal(
      PlainDate.toISOString(PlainDate.fromDate(new Date('+012026-01-01T00:00:00Z'))),
      '12026-01-01',
    );
  });

  it('completa o texto do ano negativo, sinal incluído: ano -1 vira 00-1', () => {
    const d = PlainDate.fromDate(new Date('-000001-06-01T00:00:00Z'));
    assert.equal(PlainDate.toISOString(d), '00-1-06-01');
  });

  it('com campos NaN produz 0NaN-NaN-NaN', () => {
    assert.equal(PlainDate.toISOString(PlainDate.fromDate(new Date('invalid'))), '0NaN-NaN-NaN');
  });
});
