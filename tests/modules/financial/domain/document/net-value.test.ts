import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
// W0 RED: computeNetValue ainda não existe.
import { computeNetValue } from '#src/modules/financial/domain/document/financial-data.ts';

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};

const ret = (type: 'ISS' | 'IRRF' | 'INSS' | 'CSRF', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('test setup: retention');
  return r.value;
};

// R1: Líquido = Bruto − Descontos na Fonte − Retenções − Descontos + Multa + Juros.
// Impostos registrados NÃO entram — por isso computeNetValue nem os recebe.
describe('financial/domain/document/financial-data — computeNetValue (R1)', () => {
  it('NFS-e: 1000 − 50 (fonte) − 175 (ISS+IRRF+INSS) = 775', () => {
    const r = computeNetValue({
      grossValue: money(100000),
      sourceDiscounts: money(5000),
      discounts: Money.ZERO,
      penalty: Money.ZERO,
      interest: Money.ZERO,
      retentions: [ret('ISS', 5000), ret('IRRF', 1500), ret('INSS', 11000)],
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.cents, 77500);
  });

  it('multa e juros somam ao líquido', () => {
    const r = computeNetValue({
      grossValue: money(100000),
      sourceDiscounts: money(5000),
      discounts: Money.ZERO,
      penalty: Money.ZERO,
      interest: money(500),
      retentions: [ret('ISS', 4000), ret('IRRF', 1500), ret('INSS', 11000)],
    });
    if (r.ok) assert.equal(r.value.cents, 79000);
  });

  it('rejeita líquido não-positivo', () => {
    const r = computeNetValue({
      grossValue: money(1000),
      sourceDiscounts: Money.ZERO,
      discounts: Money.ZERO,
      penalty: Money.ZERO,
      interest: Money.ZERO,
      retentions: [ret('ISS', 1000)],
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'net-value-not-positive');
  });
});

const MAX = Number.MAX_SAFE_INTEGER;

type NetCase = Readonly<{
  name: string;
  gross: number;
  sourceDiscounts?: number;
  discounts?: number;
  penalty?: number;
  interest?: number;
  retentions?: readonly number[];
  expected: Readonly<{ ok: true; cents: number }> | Readonly<{ ok: false; error: string }>;
}>;

const run = (c: NetCase) =>
  computeNetValue({
    grossValue: money(c.gross),
    sourceDiscounts: money(c.sourceDiscounts ?? 0),
    discounts: money(c.discounts ?? 0),
    penalty: money(c.penalty ?? 0),
    interest: money(c.interest ?? 0),
    retentions: (c.retentions ?? []).map((valueCents) => {
      const r = Retention.create({
        type: 'ISS',
        baseCents: valueCents,
        rateBps: 10000,
        valueCents,
      });
      if (!r.ok) throw new Error('test setup: retention');
      return r.value;
    }),
  });

const NET_CASES: readonly NetCase[] = [
  {
    name: 'bruto = MAX_SAFE e multa = 1 estoura a soma → money-exceeds-safe-integer',
    gross: MAX,
    penalty: 1,
    expected: { ok: false, error: 'money-exceeds-safe-integer' },
  },
  {
    name: 'bruto = MAX_SAFE e juros = 1 estoura a soma → money-exceeds-safe-integer',
    gross: MAX,
    interest: 1,
    expected: { ok: false, error: 'money-exceeds-safe-integer' },
  },
  {
    name: 'líquido = MAX_SAFE + 1 exato (2^53) ainda é recusado com money-exceeds-safe-integer',
    gross: MAX,
    penalty: 1,
    interest: 0,
    discounts: 0,
    expected: { ok: false, error: 'money-exceeds-safe-integer' },
  },
  {
    name: 'líquido muito acima do limite (MAX_SAFE + MAX_SAFE) → money-exceeds-safe-integer',
    gross: MAX,
    penalty: MAX,
    interest: MAX,
    discounts: MAX,
    expected: { ok: false, error: 'money-exceeds-safe-integer' },
  },
  {
    name: 'soma intermediária acima do limite com líquido final dentro dele não é recusada: MAX_SAFE + 1 − 10 = MAX_SAFE − 9',
    gross: MAX,
    penalty: 1,
    discounts: 10,
    expected: { ok: true, cents: MAX - 9 },
  },
  {
    name: 'soma intermediária acima do limite com dedução igual: MAX_SAFE + 1 − MAX_SAFE = 1',
    gross: MAX,
    penalty: 1,
    discounts: MAX,
    expected: { ok: true, cents: 1 },
  },
  {
    name: 'exatidão onde o float perderia o centavo: MAX_SAFE + 2 − 10 = MAX_SAFE − 8 (o float daria MAX_SAFE − 9)',
    gross: MAX,
    penalty: 2,
    discounts: 10,
    expected: { ok: true, cents: MAX - 8 },
  },
  {
    name: 'exatidão com multa e juros somando acima do limite: MAX_SAFE + 3 + 3 − 7 = MAX_SAFE − 1',
    gross: MAX,
    penalty: 3,
    interest: 3,
    retentions: [7],
    expected: { ok: true, cents: MAX - 1 },
  },
  {
    name: 'contraprova: soma intermediária acima do limite com líquido final exatamente 0 → net-value-not-positive',
    gross: MAX,
    penalty: 1,
    discounts: MAX,
    sourceDiscounts: 1,
    expected: { ok: false, error: 'net-value-not-positive' },
  },
  {
    name: 'vizinha válida: bruto = MAX_SAFE − 1 e multa = 1 → líquido MAX_SAFE',
    gross: MAX - 1,
    penalty: 1,
    expected: { ok: true, cents: MAX },
  },
  {
    name: 'vizinha válida: bruto = MAX_SAFE sem acréscimos → líquido MAX_SAFE',
    gross: MAX,
    expected: { ok: true, cents: MAX },
  },
  {
    name: 'deduções que estouram com bruto dentro do limite → net-value-not-positive (líquido seria negativo)',
    gross: 100000,
    sourceDiscounts: MAX,
    discounts: 1,
    expected: { ok: false, error: 'net-value-not-positive' },
  },
  {
    name: 'retenções que estouram com bruto dentro do limite → net-value-not-positive',
    gross: 100000,
    retentions: [MAX - 10, 11],
    expected: { ok: false, error: 'net-value-not-positive' },
  },
  {
    name: 'regressão realista: 1000 + 2,50 multa + 1,00 juros − 0,50 desconto = 1003,00',
    gross: 100000,
    penalty: 250,
    interest: 100,
    discounts: 50,
    expected: { ok: true, cents: 100300 },
  },
];

describe('financial/domain/document/financial-data — computeNetValue no limite seguro', () => {
  for (const c of NET_CASES) {
    it(c.name, () => {
      const r = run(c);
      if (c.expected.ok) {
        assert.deepEqual(r, { ok: true, value: { cents: c.expected.cents } });
      } else {
        assert.deepEqual(r, { ok: false, error: c.expected.error });
      }
    });
  }
});

type RealisticCase = Readonly<{
  gross: number;
  sourceDiscounts: number;
  discounts: number;
  penalty: number;
  interest: number;
  retentions: readonly number[];
}>;

const REALISTIC_CASES: readonly RealisticCase[] = [
  {
    gross: 100000,
    sourceDiscounts: 5000,
    discounts: 0,
    penalty: 0,
    interest: 0,
    retentions: [5000, 1500, 11000],
  },
  {
    gross: 100000,
    sourceDiscounts: 5000,
    discounts: 0,
    penalty: 0,
    interest: 500,
    retentions: [4000, 1500, 11000],
  },
  { gross: 1, sourceDiscounts: 0, discounts: 0, penalty: 0, interest: 0, retentions: [] },
  {
    gross: 123456789,
    sourceDiscounts: 12345,
    discounts: 6789,
    penalty: 2469,
    interest: 1234,
    retentions: [61728, 18518],
  },
  {
    gross: 9999999999999,
    sourceDiscounts: 0,
    discounts: 1,
    penalty: 0,
    interest: 0,
    retentions: [],
  },
  { gross: 1000, sourceDiscounts: 0, discounts: 0, penalty: 0, interest: 0, retentions: [1000] },
  { gross: 1000, sourceDiscounts: 600, discounts: 600, penalty: 100, interest: 0, retentions: [] },
];

/** Fórmula R1 em aritmética de `number`, como antes da mudança — exata para valores dentro do limite. */
const legacyNet = (c: RealisticCase): number =>
  c.gross +
  c.penalty +
  c.interest -
  c.sourceDiscounts -
  c.discounts -
  c.retentions.reduce((acc, v) => acc + v, 0);

describe('financial/domain/document/financial-data — computeNetValue: regressão em entradas realistas', () => {
  for (const c of REALISTIC_CASES) {
    it(`mesmo resultado da fórmula anterior para ${JSON.stringify(c)}`, () => {
      const r = run({ name: '', ...c, expected: { ok: true, cents: 0 } });
      const before = legacyNet(c);
      if (before > 0) {
        assert.deepEqual(r, { ok: true, value: { cents: before } });
      } else {
        assert.deepEqual(r, { ok: false, error: 'net-value-not-positive' });
      }
    });
  }
});

// Domínio não lança: um Money forjado (centavos fora de inteiro seguro) tem de virar Result de erro,
// nunca a RangeError do `BigInt`. Antes da soma exata em BigInt o líquido devolvia Result nesse caso.
describe('financial/domain/document/financial-data — computeNetValue com Money forjado', () => {
  const forged = (cents: number): Money.Money => ({ cents }) as unknown as Money.Money;
  // Cada parcela é revalidada por Money.fromCents, que dá nome ao defeito (como NonZeroMoney.from).
  const BAD_CENTS: readonly (readonly [number, string])[] = [
    [1.5, 'money-non-integer-value'],
    [Number.NaN, 'money-non-integer-value'],
    [Number.POSITIVE_INFINITY, 'money-non-integer-value'],
    [2 ** 53, 'money-exceeds-safe-integer'],
    [-5, 'money-negative-value'],
  ];

  for (const [cents, error] of BAD_CENTS) {
    for (const field of ['grossValue', 'penalty', 'discounts'] as const) {
      it(`${field} com ${String(cents)} centavos → err('${error}'), sem lançar`, () => {
        const input = {
          grossValue: money(100000),
          sourceDiscounts: money(0),
          discounts: money(0),
          penalty: money(0),
          interest: money(0),
          retentions: [],
          [field]: forged(cents),
        };
        assert.deepEqual(computeNetValue(input), { ok: false, error });
      });
    }
  }
});
