import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { ContractId } from '../../../domain/shared/ids.ts';
import type { Contract } from '../../../domain/contract/types.ts';
import type {
  ContractRepository,
  ListContractsQuery,
} from '../../../domain/contract/repository.ts';
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

// CTR-HTTP-CONTRACT-LIST-FILTERS — espelha em memória o que o Drizzle faz no SQL:
// search case-insensitive em title/objective/sequentialNumber, filtro de status,
// ordenação por sequentialNumber e paginação. Mantém o mesmo contrato observável.
const matchesQuery = (c: Contract, query: ListContractsQuery): boolean => {
  if (query.status !== undefined && c.status !== query.status) return false;
  if (query.search !== undefined && query.search.length > 0) {
    const term = query.search.toLowerCase();
    const haystack = `${c.title}\n${c.objective}\n${c.sequentialNumber}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  return true;
};

export const InMemoryContractRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,
): InMemoryContractRepositoryHandle => {
  const map = new Map<ContractId, Contract>();

  const repo: ContractRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findBySequentialNumber: async (sequentialNumber) =>
      ok([...map.values()].find((c) => c.sequentialNumber === sequentialNumber) ?? null),
    list: async () => ok([...map.values()]),
    listPaged: async (query) => {
      const filtered = [...map.values()]
        .filter((c) => matchesQuery(c, query))
        .sort((a, b) =>
          query.order === 'DESC'
            ? b.sequentialNumber.localeCompare(a.sequentialNumber)
            : a.sequentialNumber.localeCompare(b.sequentialNumber),
        );
      const offset = (query.page - 1) * query.limit;
      const items = filtered.slice(offset, offset + query.limit);
      return ok({ items, total: filtered.length });
    },
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
