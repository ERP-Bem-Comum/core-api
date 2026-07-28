/**
 * Adapter `GeneralReportReadPort` sobre o reader do `financial` (ACL — ADR-0006/0014).
 * Nunca importa `financial/domain` ou `financial/adapters` — só a public-api.
 *
 * Recebe o `list` de um reader **já aberto no boot** (`openGeneralReportReader`), nunca uma
 * connection-string — pool singleton de composição, fechado no `shutdown()`.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { GeneralReportReader } from '#src/modules/financial/public-api/index.ts';
import type {
  GeneralReportReadPort,
  GeneralReportReadError,
} from '../../application/ports/general-report-read.ts';

export const GeneralReportReadFromFinancial = (
  listReport: GeneralReportReader['list'],
): GeneralReportReadPort => ({
  // Filtro/paginação estruturalmente idênticos aos do financial — passam direto, sem remapear.
  list: async (filter, pagination) => {
    const listed = await listReport(filter, pagination);
    if (!listed.ok) return err<GeneralReportReadError>('general-report-read-unavailable');
    return ok(listed.value);
  },
});
