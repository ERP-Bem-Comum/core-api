import type { ContractsModuleEvent } from './event-bus.ts';
import type { EventDelivery as SharedEventDelivery } from '#src/shared/outbox/index.ts';

// ─── ProcessedEvent (específico do contracts — carrega o evento desserializado) ─

/**
 * Envelope de evento já lido do outbox — pronto para entrega ao consumer.
 * O worker desserializa o payload (`outboxRowToEvent`) e monta este shape antes
 * de chamar `EventDelivery.deliver`.
 */
export type ProcessedEvent = Readonly<{
  eventId: string;
  eventType: string;
  schemaVersion: number;
  event: ContractsModuleEvent;
}>;

// ─── Erros de delivery — canônicos compartilhados (CORE-OUTBOX-WORKER-GENERIC) ──

export type {
  DeliveryError,
  DeliveryUnavailable,
  DeliveryRejectedByConsumer,
} from '#src/shared/outbox/index.ts';
export { deliveryUnavailable, deliveryRejectedByConsumer } from '#src/shared/outbox/index.ts';

// ─── Port ─────────────────────────────────────────────────────────────────────

/**
 * EventDelivery — driven port para entrega de eventos a um consumer específico.
 * É o `EventDelivery<P>` genérico do `shared/outbox` aplicado ao `ProcessedEvent`
 * do contracts. `consumerId` identifica o consumer nos logs e na `eventos_processados`.
 */
export type EventDelivery = SharedEventDelivery<ProcessedEvent>;
