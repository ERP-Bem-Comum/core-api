import { ok } from '../../../../shared/primitives/result.ts';
import type { EventDelivery, ProcessedEvent } from '../../application/ports/event-delivery.ts';

// ─── InMemoryEventDelivery ────────────────────────────────────────────────────

/**
 * Adapter InMemory do EventDelivery.
 *
 * Usado em:
 * - Testes unitários e contratuais (adapter de referência para a suite).
 * - CLI da P.O. com driver `memory`.
 *
 * Acumula todos os eventos entregues em `deliveredEvents()` para inspeção
 * nos testes sem efeitos colaterais externos.
 *
 * Sempre retorna `ok(undefined)` — o InMemory não pode estar indisponível.
 */
export const InMemoryEventDelivery = (
  consumerId: string,
): EventDelivery & { deliveredEvents: () => readonly ProcessedEvent[] } => {
  const delivered: ProcessedEvent[] = [];

  return {
    consumerId,
    deliver: async (event) => {
      delivered.push(event);
      return ok(undefined);
    },
    deliveredEvents: () => delivered as readonly ProcessedEvent[],
  };
};
