import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { AmendmentId } from '../../../domain/shared/ids.ts';
import type { Amendment } from '../../../domain/amendment/types.ts';
import type { AmendmentRepository } from '../../../domain/amendment/repository.ts';
import type { OutboxPort } from '../../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import { InMemoryOutbox } from '../../outbox/outbox.in-memory.ts';

// CA-4 (CTR-OUTBOX-INTEGRATION-IN-REPOS): InMemoryAmendmentRepository recebe
// OutboxPort como dependência opcional. Default = InMemoryOutbox().port (isolado).

export type InMemoryAmendmentRepositoryHandle = Readonly<{
  repo: AmendmentRepository;
  store: () => readonly Amendment[];
  clear: () => void;
}>;

export const InMemoryAmendmentRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,
): InMemoryAmendmentRepositoryHandle => {
  const map = new Map<AmendmentId, Amendment>();

  const repo: AmendmentRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    // Leitura agregada: aditivos do contrato ordenados por `amendmentNumber` asc
    // (determinismo + paridade com o adapter Drizzle).
    findByContractId: async (contractId) => {
      const matches = [...map.values()].filter((a) => a.contractId === contractId);
      matches.sort((a, b) => a.amendmentNumber.localeCompare(b.amendmentNumber));
      return ok(matches);
    },
    // CA-4: save persiste o agregado na map E appenda eventos no outbox.
    save: async (amendment: Amendment, events: readonly ContractsModuleEvent[]) => {
      map.set(amendment.id, amendment);
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
