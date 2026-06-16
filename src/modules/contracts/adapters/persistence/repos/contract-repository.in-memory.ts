import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { ContractId } from '../../../domain/shared/ids.ts';
import type { Contract, ActiveContract } from '../../../domain/contract/types.ts';
import type {
  ContractRepository,
  ListContractsQuery,
} from '../../../domain/contract/repository.ts';
import type { OutboxPort } from '../../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import { InMemoryOutbox } from '../../outbox/outbox.in-memory.ts';
import { formatSequentialNumber } from '../../../domain/contract/sequential-number.ts';
import { Contract as ContractAgg } from '../../../domain/contract/contract.ts';
import * as PlainDate from '../../../../../shared/kernel/plain-date.ts';
import type { PlainDate as PlainDateType } from '../../../../../shared/kernel/plain-date.ts';

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
  // CTR-CONTRACT-SEQUENTIAL-NUMBER: contador por ano, espelha a tabela
  // `ctr_contract_seq` do adapter Drizzle. Mesma semântica de sequência: gaps
  // são aceitáveis (incrementa por chamada, independente do save subsequente).
  const seqByYear = new Map<number, number>();

  const repo: ContractRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findBySequentialNumber: async (sequentialNumber) =>
      ok([...map.values()].find((c) => c.sequentialNumber === sequentialNumber) ?? null),
    nextSequentialNumber: async (year) => {
      const next = (seqByYear.get(year) ?? 0) + 1;
      seqByYear.set(year, next);
      return ok(formatSequentialNumber(next, year));
    },
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

    // CTR-AUTO-EXPIRE (issue #39 · ADR-0041): espelha o filtro do adapter Drizzle em memória.
    // Elegível = Active + Fixed + currentPeriod.end < cutoff.
    // Ordena determinístico por (end ASC, id ASC) — mesma semântica do ORDER BY do SQL
    // (current_period_end ASC garante que contratos mais antigos expiram primeiro; id
    //  como tie-break para testes determinísticos). Aplica limit.
    //
    // Decisão CA5 (opção a): SELECT simples, SEM FOR UPDATE — o lock não persistiria
    // entre findExpirable (tx A) e save (tx B) separadas. Coordenação multi-instância
    // fica para F-Plus via GET_LOCK ou UNIQUE(job_name, run_date) — ADR-0041 §"Decisão (4)".
    findExpirable: async (cutoff: PlainDateType, limit: number) => {
      // Coleta apenas Active + Fixed com end < cutoff.
      // `ActiveFixed` é um subtipo local que estreita `currentPeriod` para Fixed,
      // permitindo acessar `.end` sem erro de compilação no sort abaixo.
      type ActiveFixed = ActiveContract &
        Readonly<{ currentPeriod: { kind: 'Fixed'; end: PlainDateType; start: PlainDateType } }>;

      const activeFixed: ActiveFixed[] = [];
      for (const c of map.values()) {
        if (c.status !== 'Active') continue;
        if (c.currentPeriod.kind !== 'Fixed') continue;
        // Elegível: end < cutoff  (D+1 — guarda D+1 vive em Contract.expire)
        if (!PlainDate.isBefore(c.currentPeriod.end, cutoff)) continue;
        const r = ContractAgg.parseActive(c);
        if (!r.ok) continue; // nunca — já sabemos que c.status === 'Active'
        // Narrow seguro: filtramos kind==='Fixed' acima.
        activeFixed.push(r.value as ActiveFixed);
      }
      // Ordenação determinística: (end ASC, id ASC) — mesma semântica do SQL.
      activeFixed.sort((a, b) => {
        const cmpEnd = PlainDate.compare(a.currentPeriod.end, b.currentPeriod.end);
        if (cmpEnd !== 0) return cmpEnd;
        return String(a.id).localeCompare(String(b.id));
      });
      return ok(activeFixed.slice(0, limit) as readonly ActiveContract[]);
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
