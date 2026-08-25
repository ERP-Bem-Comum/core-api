/**
 * Adapter in-memory do `DashboardCostCentersReader` (DASH-F1 · #241) — driver `memory` da borda HTTP
 * e testes `fastify.inject`.
 *
 * Espelha o contrato do reader real (`openDashboardCostCentersReader`, public-api/Drizzle): expõe
 * `list(windows)` devolvendo o agregado BRUTO por Centro de Custo (m1Cents/m2Cents já semeados). Como
 * test double, IGNORA as janelas — o CASE-SUM autoritativo sobre `paid_at` é provado pela suíte de
 * integração Drizzle (`dashboard-cost-centers.drizzle-mysql.test.ts`). `close()` é no-op (sem pool).
 * Molde: `createInMemorySuppliersWithoutContractReader`.
 */
import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  DashboardCostCenterRow,
  DashboardCostCentersReader,
  DashboardCostCentersWindows,
} from '../../../public-api/dashboard-cost-centers-projection.ts';

export const createInMemoryDashboardCostCentersReader = (
  seed: readonly DashboardCostCenterRow[] = [],
): DashboardCostCentersReader => {
  const rows: readonly DashboardCostCenterRow[] = [...seed];
  return {
    list: async (
      _windows: DashboardCostCentersWindows,
    ): Promise<Result<readonly DashboardCostCenterRow[], string>> => ok(rows),
    close: async (): Promise<void> => undefined,
  };
};
