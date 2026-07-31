/**
 * DASH-F4 (widget "Realizado x Previsto mensal" · #112) — W0 RED · costura sobre as duas fontes.
 *
 * Testa o adapter `DashboardRealizedReadFromSources(listPlanned, listRealized)` — molde do
 * `RealizedReadFromSources` do #502. Chama as DUAS fontes (planned por {year, budgetPlanId};
 * realized por {year, budgetPlanRef}) e:
 *   - sucesso: devolve `{ budgetPlanId, year, chart: [12] }` com o rollup de `foldMonthly`;
 *   - fail-closed: se QUALQUER fonte falhar -> `err('dashboard-realized-read-unavailable')`.
 *
 * DEVE FALHAR em W0: o adapter ainda NAO existe (ERR_MODULE_NOT_FOUND). Roda no `pnpm test` PURO.
 *
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { DashboardRealizedReadFromSources } from '#src/modules/reports/adapters/persistence/dashboard-realized-read.from-sources.ts';
import type { PlannedAmountsReadPort } from '#src/modules/budget-plans/public-api/read.ts';
import type { RealizedProvisionedReader } from '#src/modules/financial/public-api/realized-provisioned-projection.ts';

const PLAN = '10000000-0000-4000-8000-000000000001';

const plannedRow = (month: number, plannedCents: number) => ({
  budgetPlanId: PLAN,
  costCenterId: 'cc100000-0000-4000-8000-0000000000c1',
  costCenterName: 'Centro 1',
  categoryId: 'ca100000-0000-4000-8000-0000000000a1',
  categoryName: 'Categoria 1',
  subcategoryId: '5b100000-0000-4000-8000-0000000000b1',
  subcategoryName: 'Sub 1',
  month,
  plannedCents,
});

const realizedRow = (month: string, realizedCents: number) => ({
  budgetPlanRef: PLAN,
  categoryRef: 'ca100000-0000-4000-8000-0000000000a1',
  subcategoryRef: '5b100000-0000-4000-8000-0000000000b1',
  month,
  realizedCents,
  provisionedCents: 0,
});

const okPlanned =
  (rows: ReturnType<typeof plannedRow>[]): PlannedAmountsReadPort['listPlannedAmounts'] =>
  () =>
    Promise.resolve(ok(rows));
const okRealized =
  (rows: ReturnType<typeof realizedRow>[]): RealizedProvisionedReader['list'] =>
  () =>
    Promise.resolve(ok(rows));
const failPlanned: PlannedAmountsReadPort['listPlannedAmounts'] = () =>
  Promise.resolve(err('budget-plans-read-query-failed'));
const failRealized: RealizedProvisionedReader['list'] = () =>
  Promise.resolve(err('realized-provisioned-read-failure'));

describe('reports/dashboard-realized - DashboardRealizedReadFromSources', () => {
  it('sucesso: costura planned x realized por mes e devolve 12 pontos', async () => {
    const port = DashboardRealizedReadFromSources(
      okPlanned([plannedRow(3, 1000), plannedRow(4, 500)]),
      okRealized([realizedRow('2026-03', 250)]),
    );
    const r = await port.list({ budgetPlanId: PLAN, year: 2026 });
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(r.value.budgetPlanId, PLAN);
    assert.equal(r.value.year, 2026);
    assert.equal(r.value.chart.length, 12);
    assert.equal(r.value.chart.find((p) => p.month === 3)!.expectedCents, 1000);
    assert.equal(r.value.chart.find((p) => p.month === 3)!.realizedCents, 250);
    assert.equal(r.value.chart.find((p) => p.month === 4)!.expectedCents, 500);
    assert.equal(r.value.chart.find((p) => p.month === 4)!.realizedCents, 0);
  });

  it('fail-closed: fonte planned falha -> dashboard-realized-read-unavailable', async () => {
    const port = DashboardRealizedReadFromSources(failPlanned, okRealized([]));
    const r = await port.list({ budgetPlanId: PLAN, year: 2026 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'dashboard-realized-read-unavailable');
  });

  it('fail-closed: fonte realized falha -> dashboard-realized-read-unavailable', async () => {
    const port = DashboardRealizedReadFromSources(okPlanned([]), failRealized);
    const r = await port.list({ budgetPlanId: PLAN, year: 2026 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'dashboard-realized-read-unavailable');
  });
});
