import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { ExpectedCounterpartId } from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import type { ExpectedCounterpart } from '#src/modules/financial/domain/expected-counterpart/types.ts';
import type { ExpectedCounterpartEvent } from '#src/modules/financial/domain/expected-counterpart/events.ts';
import type { FinancialOutbox } from '#src/modules/financial/application/ports/outbox.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type {
  ExpectedCounterpartStore,
  ExpectedCounterpartStoreError,
} from '#src/modules/financial/application/ports/expected-counterpart-store.ts';

// Adapter in-memory do ExpectedCounterpartStore (#269, testes / boot sem DB). Paridade da atomicidade
// do Drizzle: publica os eventos no outbox ANTES de mutar o store; falha no outbox → nada muda (espelha
// reconciliation-repository.in-memory §appendOrFail). Default: outbox interno (acumula, nunca falha).
export const createInMemoryExpectedCounterpartStore = (
  outbox: FinancialOutbox = createInMemoryOutbox().port,
): ExpectedCounterpartStore => {
  const store = new Map<string, ExpectedCounterpart>();

  return {
    save: async (
      counterpart: ExpectedCounterpart,
      events?: readonly ExpectedCounterpartEvent[],
    ): Promise<Result<void, ExpectedCounterpartStoreError>> => {
      if (events !== undefined && events.length > 0) {
        const appended = await outbox.append(events);
        if (!appended.ok) return err('expected-counterpart-store-unavailable');
      }
      store.set(String(counterpart.id), counterpart);
      return ok(undefined);
    },

    findById: async (
      id: ExpectedCounterpartId,
    ): Promise<Result<ExpectedCounterpart | null, ExpectedCounterpartStoreError>> =>
      Promise.resolve(ok(store.get(String(id)) ?? null)),

    listPendingByAccount: async (
      accountRef: CedenteAccountId,
    ): Promise<Result<readonly ExpectedCounterpart[], ExpectedCounterpartStoreError>> => {
      const pending = [...store.values()].filter(
        (c) => String(c.destinationAccountRef) === String(accountRef) && c.status === 'Pending',
      );
      return Promise.resolve(ok(pending));
    },

    findByOriginReconciliation: async (
      reconciliationRef: ReconciliationId,
    ): Promise<Result<ExpectedCounterpart | null, ExpectedCounterpartStoreError>> => {
      for (const c of store.values()) {
        if (String(c.originReconciliationRef) === String(reconciliationRef)) {
          return Promise.resolve(ok(c));
        }
      }
      return Promise.resolve(ok(null));
    },
  };
};
