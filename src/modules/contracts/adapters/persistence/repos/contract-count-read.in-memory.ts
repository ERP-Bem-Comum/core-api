// 010-partner-contract-counts — adapter InMemory do ContractCountReadPort (teste/CLI/boot memory).
// Conta sobre um store injetável de linhas {contractorType, contractorId, status, amendments}.
// Default vazio → tudo 0/vazio (boot `driver=memory` não quebra; sem persistência cruzada).

import { ok } from '../../../../../shared/primitives/result.ts';
import type {
  ContractCountReadPort,
  ContractorCount,
} from '../../../application/ports/contract-count-read.ts';
import type { ContractorType } from '../../../domain/shared/contractor.ts';
import type { ContractStatus } from '../../../domain/contract/types.ts';

export type InMemoryContractCountRow = Readonly<{
  contractorType: ContractorType;
  contractorId: string;
  status: ContractStatus;
  amendments: number;
}>;

export const makeInMemoryContractCountReadPort = (
  store: readonly InMemoryContractCountRow[] = [],
): ContractCountReadPort => ({
  countByContractor: async (type, ids) => {
    const wanted = new Set(ids);
    const map = new Map<string, ContractorCount>();
    for (const id of ids) map.set(id, { contracts: 0, amendments: 0 });
    for (const row of store) {
      if (row.contractorType !== type || !wanted.has(row.contractorId)) continue;
      const cur = map.get(row.contractorId) ?? { contracts: 0, amendments: 0 };
      map.set(row.contractorId, {
        contracts: cur.contracts + 1,
        amendments: cur.amendments + row.amendments,
      });
    }
    return ok(map);
  },

  contractorIdsWithContractStatus: async (type, status: ContractStatus) =>
    ok(
      new Set(
        store
          .filter((r) => r.contractorType === type && r.status === status)
          .map((r) => r.contractorId),
      ),
    ),

  contractorIdsWithAnyContract: async (type) =>
    ok(new Set(store.filter((r) => r.contractorType === type).map((r) => r.contractorId))),
});
