import type { Result } from '../../../../shared/result.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { AmendmentEvent } from '../../domain/amendment/events.ts';

export type ContractsModuleEvent = ContractEvent | AmendmentEvent;

export type EventBusError = 'event-bus-unavailable';

export type EventBus = Readonly<{
  publish: (event: ContractsModuleEvent) => Promise<Result<void, EventBusError>>;
}>;
