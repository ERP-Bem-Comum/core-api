// BDG-BUDGET-CALC (#317) — W0 RED. Paridade das 4 fórmulas de cálculo portadas do legado
// (`../../ERP-BACKEND/src/common/utils/calc-total-value-result.ts`). Valores de referência
// calculados à mão a partir das fórmulas em .claude/.pipeline/BDG-BUDGET-CALC/001-research/LEGACY-FORMULAS.md.
// Cálculo é função pura sobre discriminated union `CalcModelInput` (discriminante = LaunchType).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CalcModel from '#src/modules/budget-plans/domain/budget-result/calc-model.ts';

describe('CalcModel.calculate — paridade 1:1 com o legado (#317, CA1)', () => {
  it('IPCA: baseValueInCents * (1 + ipca/100)', () => {
    // 100000 * (1 + 4.5/100) = 100000 * 1.045 = 104500
    const r = CalcModel.calculate({ kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.cents, 104500);
  });

  it('CAED: numberOfEnrollments * baseValueInCents (unitário)', () => {
    // 30 * 5000 = 150000
    const r = CalcModel.calculate({
      kind: 'CAED',
      numberOfEnrollments: 30,
      baseValueInCents: 5000,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.cents, 150000);
  });

  it('DESPESAS_PESSOAIS: salário ajustado + encargos% + benefícios + provisões (SEM qtd)', () => {
    // totalSalary  = 300000 * (1 + 10/100)               = 330000
    // totalCharges = 330000 * (20+11+8+1)/100            = 330000 * 0.40 = 132000
    // benefits     = 50000+20000+30000+10000             = 110000
    // provisions   = 27500+5000+27500+26400              = 86400
    // total        = 330000+132000+110000+86400          = 658400
    const r = CalcModel.calculate({
      kind: 'DESPESAS_PESSOAIS',
      salaryInCents: 300000,
      salaryAdjustment: 10,
      inssEmployer: 20,
      inss: 11,
      fgtsCharges: 8,
      pisCharges: 1,
      foodVoucherInCents: 50000,
      transportationVouchersInCents: 20000,
      healthInsuranceInCents: 30000,
      lifeInsuranceInCents: 10000,
      holidaysAndChargesInCents: 27500,
      allowanceInCents: 5000,
      thirteenthInCents: 27500,
      fgtsInCents: 26400,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.cents, 658400);
  });

  it('DESPESAS_LOGISTICAS: passagem × (pessoas×viagens); demais × diária respectiva', () => {
    // trips        = 2 * 3 = 6
    // airfare      = 6 * 50000                    = 300000   (sem diária)
    // accommodation= 6 * 4 * 15000                = 360000
    // expenses     = 6*4*5000 + 6*4*3000 + 6*2*10000 = 120000+72000+120000 = 312000
    // total        = 300000+360000+312000         = 972000
    const r = CalcModel.calculate({
      kind: 'DESPESAS_LOGISTICAS',
      numberOfPeople: 2,
      totalTrips: 3,
      airfareInCents: 50000,
      dailyAccommodation: 4,
      accommodationInCents: 15000,
      dailyFood: 4,
      foodInCents: 5000,
      dailyTransport: 4,
      transportInCents: 3000,
      dailyCarAndFuel: 2,
      carAndFuelInCents: 10000,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.cents, 972000);
  });

  it('arredondamento: float do cálculo → Math.round antes de Money (round-half-up ≡ MySQL)', () => {
    // 101 * (1 + 50/100) = 151.5 → Math.round = 152 (trunc daria 151). Trava a política de paridade.
    const r = CalcModel.calculate({
      kind: 'DESPESAS_PESSOAIS',
      salaryInCents: 101,
      salaryAdjustment: 50,
      inssEmployer: 0,
      inss: 0,
      fgtsCharges: 0,
      pisCharges: 0,
      foodVoucherInCents: 0,
      transportationVouchersInCents: 0,
      healthInsuranceInCents: 0,
      lifeInsuranceInCents: 0,
      holidaysAndChargesInCents: 0,
      allowanceInCents: 0,
      thirteenthInCents: 0,
      fgtsInCents: 0,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.cents, 152);
  });
});

describe('CalcModel.ensureMatchesLaunchType — modelo × launchType da subcategoria (#317, CA2)', () => {
  it('modelo casa com o launchType → ok, devolve o input estreitado', () => {
    const input = { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 } as const;
    const r = CalcModel.ensureMatchesLaunchType(input, 'IPCA');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.kind, 'IPCA');
  });

  it('modelo diverge do launchType → calc-model-mismatch', () => {
    const input = { kind: 'CAED', numberOfEnrollments: 30, baseValueInCents: 5000 } as const;
    const r = CalcModel.ensureMatchesLaunchType(input, 'DESPESAS_PESSOAIS');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'calc-model-mismatch');
  });
});
