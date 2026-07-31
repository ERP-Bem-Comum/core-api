/**
 * DASH-F1 (#241) — unit do assembler PURO `dashboardCostCentersToDto` (agregado por CC → DTO).
 *
 * Prova, sem infra: (a) totalExpenses = Σ m1 de todos os CCs; (b) variation via o motor #237
 * (calculateVariation + calculatePercentage) — casos `value`, `no-change` (totalM1=totalM2=0) e
 * `new` (totalM2=0 < totalM1); (c) topCostCenter = maior m1 (null quando não há despesa em M-1);
 * (d) distribution ordenada por totalCents desc, só CCs com m1 > 0, percentage correto e guarda de
 * divisão por zero (totalExpenses=0 → distribution vazia); (e) CC nulo como grupo válido.
 *
 * O motor de variação (`variation.ts`) permanece PURO — aqui só provamos o REUSO na borda.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { dashboardCostCentersToDto } from '#src/modules/financial/adapters/http/dto.ts';
import type { DashboardCostCenterRow } from '#src/modules/financial/public-api/dashboard-cost-centers-projection.ts';

describe('dashboardCostCentersToDto (#241, assembler puro)', () => {
  it('totalExpenses=Σm1, variation value, topCostCenter=maior m1, distribution desc só m1>0', () => {
    const rows: readonly DashboardCostCenterRow[] = [
      { ref: 'cc1', name: 'Alpha', m1Cents: 60000, m2Cents: 40000 },
      { ref: 'cc2', name: 'Beta', m1Cents: 30000, m2Cents: 50000 },
      { ref: 'cc3', name: 'Gamma', m1Cents: 10000, m2Cents: 0 },
      // m1=0 → fora da distribuição (a distribuição é do mês corrente M-1).
      { ref: null, name: null, m1Cents: 0, m2Cents: 5000 },
      { ref: 'cc4', name: 'Delta', m1Cents: 0, m2Cents: 0 },
    ];

    const dto = dashboardCostCentersToDto(rows);

    // totalExpenses = Σ m1 = 60000 + 30000 + 10000 = 100000.
    assert.equal(dto.totalExpenses, 100000);

    // variation = calculateVariation(totalM1=100000, totalM2=95000) → absoluteCents=5000.
    assert.equal(dto.variation.absoluteCents, 5000);
    assert.equal(dto.variation.percentage.kind, 'value');
    if (dto.variation.percentage.kind === 'value') {
      assert.equal(dto.variation.percentage.percent, ((100000 - 95000) / 95000) * 100);
    }

    // topCostCenter = maior m1 (cc1, 60000).
    assert.deepEqual(dto.topCostCenter, { ref: 'cc1', name: 'Alpha', totalCents: 60000 });

    // distribution: só m1>0, ordenada por totalCents desc; percentage = totalCents*100/totalExpenses.
    assert.deepEqual(dto.distribution, [
      { ref: 'cc1', name: 'Alpha', totalCents: 60000, percentage: 60 },
      { ref: 'cc2', name: 'Beta', totalCents: 30000, percentage: 30 },
      { ref: 'cc3', name: 'Gamma', totalCents: 10000, percentage: 10 },
    ]);
  });

  it('variation new: totalM2=0 < totalM1 → { kind: "new" }', () => {
    const rows: readonly DashboardCostCenterRow[] = [
      { ref: 'cc1', name: 'Alpha', m1Cents: 10000, m2Cents: 0 },
    ];
    const dto = dashboardCostCentersToDto(rows);
    assert.equal(dto.variation.absoluteCents, 10000);
    assert.equal(dto.variation.percentage.kind, 'new');
  });

  it('variation no-change + guarda divisão por zero: totalM1=totalM2=0 → distribution vazia', () => {
    const rows: readonly DashboardCostCenterRow[] = [
      { ref: 'cc1', name: 'Alpha', m1Cents: 0, m2Cents: 0 },
      { ref: null, name: null, m1Cents: 0, m2Cents: 0 },
    ];
    const dto = dashboardCostCentersToDto(rows);
    assert.equal(dto.totalExpenses, 0);
    assert.equal(dto.variation.absoluteCents, 0);
    assert.equal(dto.variation.percentage.kind, 'no-change');
    // totalExpenses=0 → sem CC com m1>0 → distribution vazia e topCostCenter null (guarda /0).
    assert.deepEqual(dto.distribution, []);
    assert.equal(dto.topCostCenter, null);
  });

  it('sem linhas → totais zerados, distribution vazia, topCostCenter null', () => {
    const dto = dashboardCostCentersToDto([]);
    assert.equal(dto.totalExpenses, 0);
    assert.equal(dto.variation.absoluteCents, 0);
    assert.equal(dto.variation.percentage.kind, 'no-change');
    assert.deepEqual(dto.distribution, []);
    assert.equal(dto.topCostCenter, null);
  });

  it('CC nulo (título sem centro de custo) é grupo válido na distribution e pode ser o topo', () => {
    const rows: readonly DashboardCostCenterRow[] = [
      { ref: null, name: null, m1Cents: 70000, m2Cents: 10000 },
      { ref: 'cc1', name: 'Alpha', m1Cents: 30000, m2Cents: 90000 },
    ];
    const dto = dashboardCostCentersToDto(rows);
    assert.equal(dto.totalExpenses, 100000);
    // topo = CC nulo (maior m1).
    assert.deepEqual(dto.topCostCenter, { ref: null, name: null, totalCents: 70000 });
    assert.deepEqual(dto.distribution, [
      { ref: null, name: null, totalCents: 70000, percentage: 70 },
      { ref: 'cc1', name: 'Alpha', totalCents: 30000, percentage: 30 },
    ]);
  });
});
