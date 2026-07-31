/**
 * Adapter InMemory do `DashboardRealizedReadPort` — driver `memory` (testes, boot HTTP sem DB).
 *
 * Aceita fontes planas semeadas (orçado + realizado) e faz o rollup via `foldMonthly`, OU um `chart`
 * pronto (atalho para os testes HTTP, que só exercitam a serialização da rota). Sem semente, devolve
 * 12 pontos zerados. Molde: `InMemoryRealizedRead`.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type { PlannedAmountRow } from '#src/modules/budget-plans/public-api/read.ts';
import type { RealizedProvisionedRow } from '#src/modules/financial/public-api/realized-provisioned-projection.ts';
import type {
  DashboardRealizedChartPoint,
  DashboardRealizedReadPort,
} from '../../application/ports/dashboard-realized-read.ts';
import { foldMonthly } from './dashboard-realized-read.from-sources.ts';

export type InMemoryDashboardRealizedSeed = Readonly<{
  planned?: readonly PlannedAmountRow[];
  realized?: readonly RealizedProvisionedRow[];
  /** Atalho: chart pronto (12 pontos). Quando presente, ignora `planned`/`realized`. */
  chart?: readonly DashboardRealizedChartPoint[];
}>;

export const InMemoryDashboardRealizedRead = (
  seed: InMemoryDashboardRealizedSeed = {},
): DashboardRealizedReadPort => ({
  list: async ({ budgetPlanId, year }) =>
    ok({
      budgetPlanId,
      year,
      chart: seed.chart ?? foldMonthly(seed.planned ?? [], seed.realized ?? [], year),
    }),
});
