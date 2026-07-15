/**
 * Adapter `ActiveContractorReadPort` sobre o conjunto de contratantes ativos do `contracts` (ACL —
 * ADR-0006/0014). Nunca importa `contracts/domain` ou `contracts/adapters` — só a public-api.
 *
 * Recebe o `listContractorsWithActiveContract` de um reader **já aberto no boot**
 * (`buildContractsActiveContractorReadPort`), nunca uma connection-string — pool singleton de
 * composição, fechado no `shutdown()`.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { ContractsActiveContractorReadPort } from '#src/modules/contracts/public-api/index.ts';
import type {
  ActiveContractorReadPort,
  ActiveContractorReadError,
} from '../../application/ports/active-contractor-read.ts';

export const ActiveContractorReadFromContracts = (
  listContractors: ContractsActiveContractorReadPort['listContractorsWithActiveContract'],
): ActiveContractorReadPort => ({
  listContractorsWithActiveContract: async () => {
    const listed = await listContractors();
    if (!listed.ok) return err<ActiveContractorReadError>('active-contractor-read-unavailable');
    return ok(listed.value);
  },
});
