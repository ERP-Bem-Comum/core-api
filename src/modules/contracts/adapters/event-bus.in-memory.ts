import { ok } from '../../../shared/result.ts';
import type { ContractsModuleEvent, EventBus } from '../application/ports/event-bus.ts';

export type InMemoryEventBusHandle = Readonly<{
  bus: EventBus;
  published: () => readonly ContractsModuleEvent[];
  clear: () => void;
}>;

export const InMemoryEventBus = (): InMemoryEventBusHandle => {
  const log: ContractsModuleEvent[] = [];

  const bus: EventBus = {
    publish: async (event) => {
      log.push(event);
      return ok(undefined);
    },
  };

  return {
    bus,
    published: () => [...log],
    clear: () => {
      log.length = 0;
    },
  };
};
