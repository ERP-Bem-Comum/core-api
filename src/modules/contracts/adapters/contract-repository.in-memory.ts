import { ok } from '../../../shared/result.ts';
import type { ContractId } from '../domain/shared/ids.ts';
import type { Contract } from '../domain/contract/types.ts';
import type { ContractRepository } from '../application/ports/contract-repository.ts';

export type InMemoryContractRepositoryHandle = Readonly<{
  repo: ContractRepository;
  store: () => readonly Contract[];
  clear: () => void;
}>;

export const InMemoryContractRepository = (): InMemoryContractRepositoryHandle => {
  const map = new Map<ContractId, Contract>();

  const repo: ContractRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findBySequentialNumber: async (sequentialNumber) =>
      ok([...map.values()].find((c) => c.sequentialNumber === sequentialNumber) ?? null),
    list: async () => ok([...map.values()]),
    save: async (contract) => {
      map.set(contract.id, contract);
      return ok(undefined);
    },
  };

  return {
    repo,
    store: () => [...map.values()],
    clear: () => {
      map.clear();
    },
  };
};
