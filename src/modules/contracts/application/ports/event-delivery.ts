import type { Result } from '../../../../shared/primitives/result.ts';
import type { ContractsModuleEvent } from './event-bus.ts';

// ─── ProcessedEvent ───────────────────────────────────────────────────────────

/**
 * Envelope de evento já lido do outbox — pronto para entrega ao consumer.
 * O worker monta este shape antes de chamar `EventDelivery.deliver`.
 */
export type ProcessedEvent = Readonly<{
  eventId: string;
  eventType: string;
  schemaVersion: number;
  event: ContractsModuleEvent;
}>;

// ─── Tagged errors (Padrão D) ─────────────────────────────────────────────────

export type DeliveryUnavailable = Readonly<{ tag: 'DeliveryUnavailable'; cause: string }>;
export type DeliveryRejectedByConsumer = Readonly<{
  tag: 'DeliveryRejectedByConsumer';
  consumerId: string;
  reason: string;
}>;

export type DeliveryError = DeliveryUnavailable | DeliveryRejectedByConsumer;

// ─── Constructors ─────────────────────────────────────────────────────────────

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
 * EventDelivery — driven port para entrega de eventos a um consumer específico.
 *
 * Cada consumer (módulo Financeiro, Logger, etc.) registra sua própria
 * implementação deste port. O worker chama `deliver` para cada consumer
 * inscrito, lidando com falha individual sem afetar os demais.
 *
 * `consumerId` é imutável após construção — identifica o consumer nos logs
 * e na tabela `eventos_processados` (idempotência).
 */
export type EventDelivery = Readonly<{
  consumerId: string;
  deliver: (event: ProcessedEvent) => Promise<Result<void, DeliveryError>>;
}>;
