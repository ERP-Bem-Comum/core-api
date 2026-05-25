import type { Result } from '../../../../shared/primitives/result.ts';
import type { ContractsModuleEvent } from './event-bus.ts';

// ─── Tagged errors (Padrão D) ─────────────────────────────────────────────────

export type OutboxAppendUnavailable = Readonly<{ tag: 'OutboxAppendUnavailable' }>;
export type OutboxAppendSerializationFailed = Readonly<{
  tag: 'OutboxAppendSerializationFailed';
  eventType: string;
  reason: string;
}>;
export type OutboxAppendDuplicateEventId = Readonly<{
  tag: 'OutboxAppendDuplicateEventId';
  eventId: string;
}>;

export type OutboxAppendError =
  | OutboxAppendUnavailable
  | OutboxAppendSerializationFailed
  | OutboxAppendDuplicateEventId;

// ─── Constructors ─────────────────────────────────────────────────────────────

export const outboxAppendUnavailable = (): OutboxAppendUnavailable => ({
  tag: 'OutboxAppendUnavailable',
});

export const outboxAppendSerializationFailed = (
  eventType: string,
  reason: string,
): OutboxAppendSerializationFailed => ({
  tag: 'OutboxAppendSerializationFailed',
  eventType,
  reason,
});

export const outboxAppendDuplicateEventId = (eventId: string): OutboxAppendDuplicateEventId => ({
  tag: 'OutboxAppendDuplicateEventId',
  eventId,
});

// ─── Port ─────────────────────────────────────────────────────────────────────

/**
 * OutboxPort — driven port para persistência de eventos no outbox.
 *
 * Consumido internamente pelo adapter de repositório (dentro da transação),
 * não pelo use case diretamente (decisão D2 do plano Outbox MySQL).
 *
 * A assinatura sem `tx` é intencional: o InMemory funciona sem transação;
 * a versão Drizzle (ticket #3) usa `appendInTx(tx, events)` internamente
 * mas expõe este port público simples para os testes contratuais.
 */
export type OutboxPort = Readonly<{
  append: (events: readonly ContractsModuleEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
