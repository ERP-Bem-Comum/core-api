import { type Result, ok } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { DocumentEvent } from '#src/modules/financial/domain/document/events.ts';
import type {
  FinancialOutbox,
  OutboxAppendError,
} from '#src/modules/financial/application/ports/outbox.ts';

// Adapter in-memory (testes + composition de memória). Acumula os eventos publicados; `all()` inspeciona.
export const createInMemoryOutbox = (): Readonly<{
  port: FinancialOutbox;
  all: () => readonly DocumentEvent[];
}> => {
  const events: DocumentEvent[] = [];
  const port: FinancialOutbox = {
    append: async (evs: readonly DocumentEvent[]): Promise<Result<void, OutboxAppendError>> => {
      events.push(...evs);
      return Promise.resolve(ok(undefined));
    },
  };
  return immutable({ port, all: (): readonly DocumentEvent[] => events });
};
