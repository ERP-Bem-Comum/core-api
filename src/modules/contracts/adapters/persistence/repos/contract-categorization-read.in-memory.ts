import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type {
  ContractCategorizationReadError,
  ContractCategorizationReadPort,
  ContractCategorizationView,
} from '../../../application/ports/contract-categorization-read.ts';

// Read store in-memory (testes/dev): projeção semeada por contractId. Read-only.
export const createInMemoryContractCategorizationReadStore = (
  views: ReadonlyMap<string, ContractCategorizationView> = new Map(),
): ContractCategorizationReadPort => ({
  getCategorization: async (
    contractId: string,
  ): Promise<Result<ContractCategorizationView | null, ContractCategorizationReadError>> =>
    ok(views.get(contractId) ?? null),
});
