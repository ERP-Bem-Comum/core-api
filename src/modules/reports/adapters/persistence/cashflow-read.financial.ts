/**
 * Adapter `CashflowReadPort` sobre a agregação do `financial` (ACL — ADR-0006/0014).
 * Nunca importa `financial/domain` ou `financial/adapters` — só a public-api.
 *
 * Recebe o `list` de um reader **já aberto no boot** (`openCashflowReader`), nunca uma
 * connection-string — pool singleton de composição, fechado no `shutdown()`.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { CashflowReader } from '#src/modules/financial/public-api/index.ts';
import type { CashflowReadPort, CashflowReadError } from '../../application/ports/cashflow-read.ts';

export const CashflowReadFromFinancial = (
  listAggregation: CashflowReader['list'],
): CashflowReadPort => ({
  // Repassa o filtro (opcional) ao reader do financial. Estruturalmente idêntico ao `CashflowFilter`
  // do financial — passa direto, sem remapear.
  list: async (filter) => {
    const listed = await listAggregation(filter);
    if (!listed.ok) return err<CashflowReadError>('cashflow-read-unavailable');
    return ok(listed.value);
  },
});
