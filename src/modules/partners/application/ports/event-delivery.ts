// EventDelivery do módulo `partners` — replica `contracts/application/ports/event-delivery.ts`,
// mas GENÉRICO: o worker entrega a mensagem do outbox como payload OPACO (string), não como
// evento de domínio desserializado. Quem interpreta o payload é o consumidor (US2 da #47 no
// financial). Mantém o estado atual do contracts: outbox + worker logger; consumer real futuro.
//
// ADR-0015 (outbox), ADR-0006 (port = type).

import type { Result } from '#src/shared/primitives/result.ts';

// ─── ProcessedEvent ───────────────────────────────────────────────────────────

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

// ─── Tagged errors (Padrão D) ─────────────────────────────────────────────────

export type DeliveryUnavailable = Readonly<{ tag: 'DeliveryUnavailable'; cause: string }>;
export type DeliveryRejectedByConsumer = Readonly<{
  tag: 'DeliveryRejectedByConsumer';
  consumerId: string;
  reason: string;
}>;

export type DeliveryError = DeliveryUnavailable | DeliveryRejectedByConsumer;

export const deliveryUnavailable = (cause: string): DeliveryUnavailable => ({
  tag: 'DeliveryUnavailable',
  cause,
});

export const deliveryRejectedByConsumer = (
  consumerId: string,
  reason: string,
): DeliveryRejectedByConsumer => ({
  tag: 'DeliveryRejectedByConsumer',
  consumerId,
  reason,
});

// ─── Port ─────────────────────────────────────────────────────────────────────

/**
 * EventDelivery — driven port para entrega de mensagens a um consumer.
 *
 * Cada consumer (Logger hoje; financial via US2 futura) registra sua própria
 * implementação. O worker chama `deliver` para cada mensagem pendente.
 */
export type EventDelivery = Readonly<{
  consumerId: string;
  deliver: (event: ProcessedEvent) => Promise<Result<void, DeliveryError>>;
}>;
