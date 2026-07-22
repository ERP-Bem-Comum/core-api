/**
 * Adapter `RealizedByPlanReader` (port do budget-plans) sobre o reader do `financial` (ACL —
 * ADR-0006/0014). Nunca importa `financial/domain` ou `financial/adapters` — só a public-api.
 *
 * Recebe o `getByPlans` de um reader **já aberto no boot** (`openRealizedByPlanReader`), nunca uma
 * connection-string — pool singleton de composição, fechado no `shutdown()`. Traduz o erro interno
 * do financial (string) para o erro do port (fail-closed: read-unavailable).
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { RealizedByPlanReader as FinancialRealizedByPlanReader } from '#src/modules/financial/public-api/index.ts';
import type {
  RealizedByPlanReader,
  RealizedByPlanReadError,
} from '../../application/ports/realized-by-plan-reader.ts';

export const RealizedByPlanReadFromFinancial = (
  getByPlans: FinancialRealizedByPlanReader['getByPlans'],
): RealizedByPlanReader => ({
  getByPlans: async (refs) => {
    const read = await getByPlans(refs);
    if (!read.ok) return err<RealizedByPlanReadError>('realized-by-plan-read-unavailable');
    return ok(read.value);
  },
});
