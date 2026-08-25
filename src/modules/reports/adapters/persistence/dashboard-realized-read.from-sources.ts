/**
 * Adapter `DashboardRealizedReadPort` sobre DUAS fontes lidas via public-api (ACL — ADR-0006/0014).
 * Molde: `RealizedReadFromSources` (#502), mas ROLLUP MENSAL (12 pontos) em vez da árvore.
 *
 * Recebe os dois `list` de readers JÁ ABERTOS no boot (nunca connection-strings) — pools singleton
 * de composição, fechados no `shutdown()` (incidente RDS 0001). Nunca importa
 * `budget-plans/domain|adapters` nem `financial/domain|adapters` — só as public-api.
 *
 * Fontes (ambas já filtram por plano + ano — o rollup é só somar por mês):
 *   - orçado (`budget-plans`): `listPlannedAmounts({ year, budgetPlanId })` — grade de 12 garantida.
 *   - realizado (`financial`): `list({ year, budgetPlanRef })` — mês 'YYYY-MM'; usa só `realizedCents`
 *     (o `provisionedCents` é IGNORADO — decisão da P.O.: Previsto = orçado, não provisionado).
 * Se QUALQUER fonte falhar → `err('dashboard-realized-read-unavailable')` (fail-closed, como o #502).
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type {
  PlannedAmountRow,
  PlannedAmountsReadPort,
} from '#src/modules/budget-plans/public-api/read.ts';
import type {
  RealizedProvisionedRow,
  RealizedProvisionedReader,
} from '#src/modules/financial/public-api/realized-provisioned-projection.ts';
import type {
  DashboardRealizedChartPoint,
  DashboardRealizedReadPort,
} from '../../application/ports/dashboard-realized-read.ts';

const MONTHS_IN_YEAR = 12;

/**
 * Rollup mensal PURO e determinístico — o coração do widget. Soma o orçado e o realizado por mês e
 * devolve EXATAMENTE 12 pontos (mês 1..12, ascendente).
 *   - `expectedCents[m]` = Σ `plannedCents` do planned no mês m (grade de 12 já garante o mês).
 *   - `realizedCents[m]` = Σ `realizedCents` do realized no mês m (parse `month.slice(5,7)` → int).
 * Defensivo: mês fora de 1..12 (planned) ou linha de OUTRO ano (realized) é ignorada — nunca estoura
 * o array nem contamina o exercício pedido.
 */
export const foldMonthly = (
  planned: readonly PlannedAmountRow[],
  realized: readonly RealizedProvisionedRow[],
  year: number,
): readonly DashboardRealizedChartPoint[] => {
  const expected = Array.from({ length: MONTHS_IN_YEAR }, () => 0);
  const realizedTotals = Array.from({ length: MONTHS_IN_YEAR }, () => 0);

  for (const row of planned) {
    const idx = row.month - 1;
    if (idx < 0 || idx >= MONTHS_IN_YEAR) continue; // defensivo: mês fora de 1..12
    expected[idx] = (expected[idx] ?? 0) + row.plannedCents;
  }

  for (const row of realized) {
    // 'YYYY-MM' → ano + mês. Linha de outro ano é ignorada (o reader já filtra, isto é defesa extra).
    if (Number(row.month.slice(0, 4)) !== year) continue;
    const idx = Number(row.month.slice(5, 7)) - 1;
    if (idx < 0 || idx >= MONTHS_IN_YEAR) continue;
    // Só o realizado (conciliado). `provisionedCents` NÃO entra — Previsto vem do orçado.
    realizedTotals[idx] = (realizedTotals[idx] ?? 0) + row.realizedCents;
  }

  return Array.from({ length: MONTHS_IN_YEAR }, (_unused, i) => ({
    month: i + 1,
    expectedCents: expected[i] ?? 0,
    realizedCents: realizedTotals[i] ?? 0,
  }));
};

export const DashboardRealizedReadFromSources = (
  listPlanned: PlannedAmountsReadPort['listPlannedAmounts'],
  listRealized: RealizedProvisionedReader['list'],
): DashboardRealizedReadPort => ({
  list: async ({ budgetPlanId, year }) => {
    const plannedR = await listPlanned({ year, budgetPlanId });
    if (!plannedR.ok) return err('dashboard-realized-read-unavailable');

    const realizedR = await listRealized({ year, budgetPlanRef: budgetPlanId });
    if (!realizedR.ok) return err('dashboard-realized-read-unavailable');

    return ok({ budgetPlanId, year, chart: foldMonthly(plannedR.value, realizedR.value, year) });
  },
});
