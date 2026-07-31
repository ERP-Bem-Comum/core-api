/**
 * DASH-F4 (widget "Realizado x Previsto mensal" do Dashboard · parte do #112) — W0 RED · rollup puro.
 *
 * Testa a FUNCAO PURA `foldMonthly(planned, realized, year)` — o coracao do widget. Recebe as DUAS
 * fontes planas (ja lidas via public-api, ADR-0006):
 *   - `planned`  : orcado (subcategoria x mes 1..12) — grade de 12 garantida pelo budget-plans.
 *   - `realized` : realizado/provisionado (subcategoria x mes 'YYYY-MM') — S5 do #502.
 * e devolve EXATAMENTE 12 pontos (mes 1..12 ascendente), cada um com `{ month, expectedCents,
 * realizedCents }`. So `realizedCents` do realized entra (o `provisionedCents` e IGNORADO — decisao
 * da P.O.: Previsto = orcado do budget-plans, nao o provisionado do financial).
 *
 * DEVE FALHAR em W0: `dashboard-realized-read.from-sources.ts` (que exporta `foldMonthly`) ainda NAO
 * existe — o import de topo quebra (ERR_MODULE_NOT_FOUND) e TODO este arquivo fica vermelho. RED pelo
 * motivo certo. Roda no `pnpm test` PURO (funcao pura, zero DB).
 *
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { foldMonthly } from '#src/modules/reports/adapters/persistence/dashboard-realized-read.from-sources.ts';
import type { PlannedAmountRow } from '#src/modules/budget-plans/public-api/read.ts';
import type { RealizedProvisionedRow } from '#src/modules/financial/public-api/realized-provisioned-projection.ts';

const PLAN = '10000000-0000-4000-8000-000000000001';
const CC = 'cc100000-0000-4000-8000-0000000000c1';
const CAT = 'ca100000-0000-4000-8000-0000000000a1';
const SUB1 = '5b100000-0000-4000-8000-0000000000b1';
const SUB2 = '5b200000-0000-4000-8000-0000000000b2';

const planned = (month: number, subcategoryId: string, plannedCents: number): PlannedAmountRow => ({
  budgetPlanId: PLAN,
  costCenterId: CC,
  costCenterName: 'Centro 1',
  categoryId: CAT,
  categoryName: 'Categoria 1',
  subcategoryId,
  subcategoryName: 'Sub',
  month,
  plannedCents,
});

const realized = (
  month: string,
  subcategoryRef: string | null,
  realizedCents: number,
  provisionedCents = 0,
): RealizedProvisionedRow => ({
  budgetPlanRef: PLAN,
  categoryRef: CAT,
  subcategoryRef,
  month,
  realizedCents,
  provisionedCents,
});

describe('reports/dashboard-realized - foldMonthly (rollup mensal puro)', () => {
  it('sempre devolve 12 entradas ordenadas 1..12', () => {
    const chart = foldMonthly([], [], 2026);
    assert.equal(chart.length, 12);
    assert.deepEqual(
      chart.map((p) => p.month),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    );
  });

  it('cada ponto tem exatamente {month, expectedCents, realizedCents}', () => {
    const chart = foldMonthly([], [], 2026);
    assert.deepEqual(Object.keys(chart[0]!).sort(), ['expectedCents', 'month', 'realizedCents']);
  });

  it('expected[m] = soma dos plannedCents daquele mes (varias subcategorias somam)', () => {
    const chart = foldMonthly(
      [planned(3, SUB1, 1000), planned(3, SUB2, 500), planned(7, SUB1, 200)],
      [],
      2026,
    );
    assert.equal(chart.find((p) => p.month === 3)!.expectedCents, 1500);
    assert.equal(chart.find((p) => p.month === 7)!.expectedCents, 200);
    assert.equal(chart.find((p) => p.month === 1)!.expectedCents, 0);
  });

  it('realized[m] = soma dos realizedCents daquele mes (parse YYYY-MM -> mes)', () => {
    const chart = foldMonthly(
      [],
      [
        realized('2026-03', SUB1, 250),
        realized('2026-03', SUB2, 50),
        realized('2026-11', SUB1, 900),
      ],
      2026,
    );
    assert.equal(chart.find((p) => p.month === 3)!.realizedCents, 300);
    assert.equal(chart.find((p) => p.month === 11)!.realizedCents, 900);
    assert.equal(chart.find((p) => p.month === 1)!.realizedCents, 0);
  });

  it('meses sem realized ficam com realizedCents = 0 (a grade do planned garante o mes)', () => {
    const chart = foldMonthly([planned(5, SUB1, 400)], [], 2026);
    const may = chart.find((p) => p.month === 5)!;
    assert.equal(may.expectedCents, 400);
    assert.equal(may.realizedCents, 0);
  });

  it('IGNORA o provisionedCents do financial (Previsto = orcado, nao provisionado)', () => {
    const chart = foldMonthly([], [realized('2026-04', SUB1, 100, 99999)], 2026);
    const apr = chart.find((p) => p.month === 4)!;
    assert.equal(apr.realizedCents, 100);
    // provisioned nunca entra em lugar nenhum do ponto.
    assert.deepEqual(Object.keys(apr).sort(), ['expectedCents', 'month', 'realizedCents']);
  });

  it('defensivo: realized de OUTRO ano e ignorado', () => {
    const chart = foldMonthly([], [realized('2025-06', SUB1, 777)], 2026);
    assert.equal(chart.find((p) => p.month === 6)!.realizedCents, 0);
  });

  it('defensivo: mes fora de 1..12 no planned e ignorado (nao estoura o array)', () => {
    const chart = foldMonthly([planned(0, SUB1, 111), planned(13, SUB1, 222)], [], 2026);
    assert.equal(chart.length, 12);
    assert.equal(
      chart.reduce((a, p) => a + p.expectedCents, 0),
      0,
    );
  });
});
