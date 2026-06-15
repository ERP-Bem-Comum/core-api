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
