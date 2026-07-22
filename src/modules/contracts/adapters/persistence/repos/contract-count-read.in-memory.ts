import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type {
  ContractCountByContractor,
  ContractCountReadError,
  ContractCountReadPort,
} from '../../../application/ports/contract-count-read.ts';

// Read store in-memory (testes/dev): projeção semeada por contractorRef. Read-only.
export const makeInMemoryContractCountRead = (
  seed: readonly ContractCountByContractor[] = [],
): ContractCountReadPort => ({
  listActiveContractCountsByContractor: async (): Promise<
    Result<readonly ContractCountByContractor[], ContractCountReadError>
  > => ok(seed),
});
