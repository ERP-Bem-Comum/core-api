/**
 * Adapter `AnalysisReadPort` sobre a agregação temporal do `financial` (ACL — ADR-0006/0014).
 * Nunca importa `financial/domain` ou `financial/adapters` — só a public-api.
 *
 * Recebe o `list` de um reader **já aberto no boot** (`openPayablesAnalysisReader`), nunca uma
 * connection-string — pool singleton de composição, fechado no `shutdown()`.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { PayablesAnalysisReader } from '#src/modules/financial/public-api/index.ts';
import type { AnalysisReadPort, AnalysisReadError } from '../../application/ports/analysis-read.ts';

export const AnalysisReadFromFinancial = (
  listAggregation: PayablesAnalysisReader['list'],
): AnalysisReadPort => ({
  list: async (filter) => {
    const listed = await listAggregation(filter);
    if (!listed.ok) return err<AnalysisReadError>('analysis-read-unavailable');
    return ok(listed.value);
  },
});
