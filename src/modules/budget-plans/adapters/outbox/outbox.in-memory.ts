import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { BudgetPlansModuleEvent } from '../../public-api/events.ts';
import type { OutboxPort } from '../../application/ports/outbox.ts';

export type InMemoryOutboxHandle = Readonly<{
  port: OutboxPort;
  drained: () => readonly BudgetPlansModuleEvent[];
  clear: () => void;
}>;

export const InMemoryOutbox = (): InMemoryOutboxHandle => {
  const events: BudgetPlansModuleEvent[] = [];

  const port: OutboxPort = {
    append: async (toAppend): Promise<Result<void, never>> => {
      await Promise.resolve();
      events.push(...toAppend);
      return ok(undefined);
    },
  };

  return {
    port,
    drained: () => [...events],
    clear: () => {
      events.length = 0;
    },
  };
};
