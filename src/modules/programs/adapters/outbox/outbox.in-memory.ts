import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { ProgramsModuleEvent } from '../../public-api/events.ts';
import type { OutboxPort } from '../../application/ports/outbox.ts';

export type InMemoryOutboxHandle = Readonly<{
  port: OutboxPort;
  drained: () => readonly ProgramsModuleEvent[];
  clear: () => void;
}>;

export const InMemoryOutbox = (): InMemoryOutboxHandle => {
  const events: ProgramsModuleEvent[] = [];

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
