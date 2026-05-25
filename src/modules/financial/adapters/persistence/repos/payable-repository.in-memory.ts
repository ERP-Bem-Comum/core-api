/**
 * Adapter InMemory do `PayableRepository`.
 *
 * Uso:
 *   - Tests (suite `payable-repository.suite.ts` exercita comportamento end-to-end).
 *   - CLI da P.O. com driver `memory` (default em `pnpm run cli:financial`).
 *
 * **R2 enforce (Anti-Duplicidade FITID — handbook 04:57):**
 * `save` rejeita `payable-fitid-duplicate` quando outro Payable (id diferente) já
 * consumiu o mesmo FITID em estado Bank-Paid ou Bank-Settled. Defesa em
 * profundidade — adapter MySQL real teria UNIQUE INDEX no schema.
 *
 * **Outbox integration (FIN-USECASE-APPROVE-PAYABLE — ADR-0015 D2):**
 * `save(payable, events)` recebe eventos produzidos pela operação de domínio e
 * delega para o `OutboxPort` injetado no factory. Default = `InMemoryOutbox().port`
 * isolado por instância (suites de persistência que passam `[]` como events não
 * precisam inspecionar o outbox). Quando o caller injeta o mesmo outbox usado
 * pelo use case, eventos ficam observáveis via `outbox.all()`/`pending()`.
 *
 * Pattern espelha `src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts`.
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type { FITID } from '#src/modules/financial/domain/shared/fitid.ts';
import type { PayableId } from '#src/modules/financial/domain/shared/payable-id.ts';
import type {
  PayableRepository,
  PayableRepositoryError,
} from '#src/modules/financial/domain/payable/repository.ts';
import type { Payable } from '#src/modules/financial/domain/payable/types.ts';
import type { OutboxPort } from '#src/modules/financial/application/ports/outbox.ts';
import { InMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';

export type InMemoryPayableRepositoryHandle = Readonly<{
  repo: PayableRepository;
  store: () => readonly Payable[];
  clear: () => void;
}>;

/**
 * Helper module-private: true SSE o Payable consumiu o `fitid` informado.
 * Apenas variantes Bank de Paid e Settled têm FITID — narrowing via `status`
 * + `paidVia` garante type-safety.
 */
const hasFitid = (p: Payable, fitid: FITID): boolean =>
  (p.status === 'Paid' || p.status === 'Settled') && p.paidVia === 'Bank' && p.fitid === fitid;

export const InMemoryPayableRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,
): InMemoryPayableRepositoryHandle => {
  const map = new Map<PayableId, Payable>();

  const repo: PayableRepository = {
    findById: async (id) => ok(map.get(id) ?? null),

    findByFitid: async (fitid) => ok([...map.values()].find((p) => hasFitid(p, fitid)) ?? null),

    list: async () => ok([...map.values()]),

    save: async (payable, events) => {
      // R2 enforce: se o Payable a ser persistido é Bank-Paid/Settled, garante
      // que NENHUM OUTRO Payable (id diferente) já tenha esse mesmo FITID.
      // Upsert do MESMO payable (mesmo id) é livre — não disparar false-positive.
      // Guard R2 ANTES do outbox.append — duplicate impede tudo (state + events).
      if (
        (payable.status === 'Paid' || payable.status === 'Settled') &&
        payable.paidVia === 'Bank'
      ) {
        const owner = [...map.values()].find(
          (p) => p.id !== payable.id && hasFitid(p, payable.fitid),
        );
        if (owner !== undefined) {
          const error: PayableRepositoryError = 'payable-fitid-duplicate';
          return err(error);
        }
      }

      // Persiste payable + enfileira eventos no outbox (ADR-0015 D2).
      // No InMemory, "atomicidade" é trivial (single-threaded); no Drizzle real
      // ambas as operações entram na MESMA transação. Lista vazia é no-op.
      map.set(payable.id, payable);
      if (events.length > 0) {
        const appended = await outbox.append(events);
        if (!appended.ok) return err(appended.error);
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
