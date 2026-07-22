/**
 * Adapter `RealizedReadPort` sobre DUAS fontes lidas via public-api (ACL — ADR-0006/0014). Nunca
 * importa `budget-plans/domain|adapters` nem `financial/domain|adapters` — só as public-api.
 *
 * Recebe os dois `list` de readers JÁ ABERTOS no boot (nunca connection-strings) — pools singleton
 * de composição, fechados no `shutdown()` (incidente RDS 0001). Molde: `AnalysisReadFromFinancial`.
 *
 * Mapeia `RealizedFilter` (refs de árvore) para o filtro de cada fonte:
 *   - orçado (`budget-plans`): year + refs opcionais, campos homônimos;
 *   - financeiro (`financial`): só `budgetPlanRef` + `year` (o financeiro não conhece Rede/programa;
 *     a árvore já é recortada pelo orçado, e o casamento na costura é por budgetPlanRef+subcategoryRef).
 * Se QUALQUER fonte falhar → `err('realized-read-unavailable')` (fail-closed). Sucesso → stitch.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { PlannedAmountsReadPort } from '#src/modules/budget-plans/public-api/read.ts';
import type { RealizedProvisionedReader } from '#src/modules/financial/public-api/index.ts';
import type { RealizedReadPort, RealizedFilter } from '../../application/ports/realized-read.ts';
import { stitchRealizedReport } from './realized-read.stitch.ts';

export const RealizedReadFromSources = (
  listPlanned: PlannedAmountsReadPort['listPlannedAmounts'],
  listFinancial: RealizedProvisionedReader['list'],
): RealizedReadPort => ({
  list: async (filter: RealizedFilter) => {
    const plannedR = await listPlanned({
      year: filter.year,
      ...(filter.programRef !== undefined ? { programRef: filter.programRef } : {}),
      ...(filter.budgetPlanId !== undefined ? { budgetPlanId: filter.budgetPlanId } : {}),
      ...(filter.partnerStateRef !== undefined ? { partnerStateRef: filter.partnerStateRef } : {}),
      ...(filter.partnerMunicipalityRef !== undefined
        ? { partnerMunicipalityRef: filter.partnerMunicipalityRef }
        : {}),
    });
    if (!plannedR.ok) return err('realized-read-unavailable');

    const financialR = await listFinancial({
      year: filter.year,
      ...(filter.budgetPlanId !== undefined ? { budgetPlanRef: filter.budgetPlanId } : {}),
    });
    if (!financialR.ok) return err('realized-read-unavailable');

    return ok(stitchRealizedReport(plannedR.value, financialR.value));
  },
});
