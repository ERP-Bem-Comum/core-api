import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { ContractId } from '../../../domain/shared/ids.ts';
import type { Contract } from '../../../domain/contract/types.ts';
import type { ContractRepository } from '../../../domain/contract/repository.ts';
import type { OutboxPort } from '../../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import { InMemoryOutbox } from '../../outbox/outbox.in-memory.ts';

// CA-4 (CTR-OUTBOX-INTEGRATION-IN-REPOS): InMemoryContractRepository recebe
// OutboxPort como dependência opcional. Default = InMemoryOutbox().port (isolado).
// Quando injetado pelo caller, compartilha o mesmo outbox (observável via all/pending).
//
// Por que default em vez de obrigatório?
//   - Suites de persistência (`contract-repository.suite.ts`) passam [] como events —
//     o outbox é efêmero e não precisa ser inspecionado nesses testes.
//   - Testes de use case injetam o mesmo outbox para verificar os eventos.

export type InMemoryContractRepositoryHandle = Readonly<{
  repo: ContractRepository;
  store: () => readonly Contract[];
  clear: () => void;
}>;

export const InMemoryContractRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,
): InMemoryContractRepositoryHandle => {
  const map = new Map<ContractId, Contract>();

  const repo: ContractRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findBySequentialNumber: async (sequentialNumber) =>
      ok([...map.values()].find((c) => c.sequentialNumber === sequentialNumber) ?? null),
    list: async () => ok([...map.values()]),
    // CA-4: save persiste o agregado na map E appenda eventos no outbox.
    // Se o outbox retornar erro, propagamos como ContractRepositoryError.
    save: async (contract: Contract, events: readonly ContractsModuleEvent[]) => {
      map.set(contract.id, contract);
      if (events.length > 0) {
        const r = await outbox.append(events);
        if (!r.ok) return err(r.error);
      }
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
