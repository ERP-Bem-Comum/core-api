import type { Result } from '../../../../shared/primitives/result.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { AmendmentEvent } from '../../domain/amendment/events.ts';
import type { DocumentEvent } from '../../domain/document/events.ts';

export type ContractsModuleEvent = ContractEvent | AmendmentEvent | DocumentEvent;

export type EventBusError = 'event-bus-unavailable';

export type EventBus = Readonly<{
  publish: (event: ContractsModuleEvent) => Promise<Result<void, EventBusError>>;
}>;
