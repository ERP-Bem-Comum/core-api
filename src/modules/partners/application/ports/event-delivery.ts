// EventDelivery do `partners` — o worker entrega a mensagem do outbox como payload OPACO
// (string), não como evento de domínio desserializado. Quem interpreta o payload é o
// consumidor (US2 da #47 no financial). Os erros de delivery são canônicos compartilhados
// (`src/shared/outbox`, CORE-OUTBOX-WORKER-GENERIC).
//
// ADR-0015 (outbox), ADR-0006 (port = type).

import type { EventDelivery as SharedEventDelivery } from '#src/shared/outbox/index.ts';

// ─── ProcessedEvent (específico do partners — payload opaco) ───────────────────

/**
 * Envelope de mensagem já lida do outbox — pronta para entrega ao consumer.
 * `payload` é a string opaca persistida em `par_outbox.payload` (JSON de integração).
 */
export type ProcessedEvent = Readonly<{
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  schemaVersion: number;
  occurredAt: Date;
  payload: string;
}>;

// ─── Erros de delivery — canônicos compartilhados ──────────────────────────────

export type {
  DeliveryError,
  DeliveryUnavailable,
  DeliveryRejectedByConsumer,
} from '#src/shared/outbox/index.ts';
export { deliveryUnavailable, deliveryRejectedByConsumer } from '#src/shared/outbox/index.ts';

// ─── Port ─────────────────────────────────────────────────────────────────────

/**
 * EventDelivery — driven port para entrega de mensagens a um consumer.
 * É o `EventDelivery<P>` genérico do `shared/outbox` aplicado ao `ProcessedEvent`
 * (payload opaco) do partners.
 */
export type EventDelivery = SharedEventDelivery<ProcessedEvent>;
