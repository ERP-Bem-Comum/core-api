/**
 * Adapter `SuppliersWithoutContractReadPort` sobre a agregação do `financial` (ACL —
 * ADR-0006/0014). Nunca importa `financial/domain` ou `financial/adapters` — só a public-api.
 *
 * Recebe o `list` de um reader **já aberto no boot** (`openSuppliersWithoutContractReader`), nunca
 * uma connection-string — pool singleton de composição, fechado no `shutdown()`.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { SuppliersWithoutContractReader } from '#src/modules/financial/public-api/index.ts';
import type {
  SuppliersWithoutContractReadPort,
  SuppliersWithoutContractReadError,
} from '../../application/ports/suppliers-without-contract-read.ts';

export const SuppliersWithoutContractReadFromFinancial = (
  listAggregation: SuppliersWithoutContractReader['list'],
): SuppliersWithoutContractReadPort => ({
  list: async () => {
    const listed = await listAggregation();
    if (!listed.ok) {
      return err<SuppliersWithoutContractReadError>('suppliers-without-contract-read-unavailable');
    }
    return ok(listed.value);
  },
});
