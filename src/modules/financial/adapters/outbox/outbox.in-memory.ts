import { type Result, ok } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type {
  FinancialOutbox,
  FinancialAppendableEvent,
  OutboxAppendError,
} from '#src/modules/financial/application/ports/outbox.ts';

// Adapter in-memory (testes + composition de memória). Acumula os eventos publicados; `all()` inspeciona.
export const createInMemoryOutbox = (): Readonly<{
  port: FinancialOutbox;
  all: () => readonly FinancialAppendableEvent[];
}> => {
  const events: FinancialAppendableEvent[] = [];
  const port: FinancialOutbox = {
    append: async (
      evs: readonly FinancialAppendableEvent[],
    ): Promise<Result<void, OutboxAppendError>> => {
      events.push(...evs);
      return Promise.resolve(ok(undefined));
    },
  };
  return immutable({ port, all: (): readonly FinancialAppendableEvent[] => events });
};
