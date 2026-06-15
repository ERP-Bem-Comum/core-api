import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: VOs de imposto ainda não existem.
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as RegisteredTax from '#src/modules/financial/domain/shared/registered-tax.ts';

describe('financial/domain/shared/retention — gera filho, abate do líquido', () => {
  it('cria retenção ISS válida com base, alíquota (bps) e valor', () => {
    const r = Retention.create({ type: 'ISS', baseCents: 100000, rateBps: 500, valueCents: 5000 });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.type, 'ISS');
      assert.equal(r.value.value.cents, 5000);
    }
  });

  it('aceita os 4 tipos de retenção (ISS, IRRF, INSS, CSRF)', () => {
    for (const type of ['ISS', 'IRRF', 'INSS', 'CSRF'] as const) {
      assert.equal(
        isOk(Retention.create({ type, baseCents: 1000, rateBps: 100, valueCents: 10 })),
        true,
      );
    }
  });

  it('rejeita tipo fora do union de retenção (validação runtime)', () => {
    assert.equal(
      isErr(Retention.create({ type: 'ICMS', baseCents: 1000, rateBps: 100, valueCents: 10 })),
      true,
    );
  });

  it('rejeita valor negativo (via Money)', () => {
    assert.equal(
      isErr(Retention.create({ type: 'ISS', baseCents: 1000, rateBps: 100, valueCents: -1 })),
      true,
    );
  });
});

describe('financial/domain/shared/registered-tax — apenas leitura, nunca gera filho', () => {
  it('cria imposto registrado ICMS', () => {
    const r = RegisteredTax.create({
      type: 'ICMS',
      baseCents: 500000,
      rateBps: 1800,
      valueCents: 90000,
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.type, 'ICMS');
  });

  it('aceita ICMS/IPI/PIS/COFINS e os da Reforma (CBS, IBS Municipal, IBS Estadual)', () => {
    for (const type of [
      'ICMS',
      'IPI',
      'PIS',
      'COFINS',
      'CBS',
      'IBS_Municipal',
      'IBS_Estadual',
    ] as const) {
      assert.equal(
        isOk(RegisteredTax.create({ type, baseCents: 1000, rateBps: 100, valueCents: 10 })),
        true,
      );
    }
  });
});
