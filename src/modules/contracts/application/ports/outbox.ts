import type { Result } from '../../../../shared/primitives/result.ts';
import type { ContractsModuleEvent } from './event-bus.ts';

// ─── Consumo do outbox (worker) — tipos canônicos compartilhados ──────────────
//
// `OutboxRow`, `OutboxQueryError`, `OutboxBatchOps`, `WorkerOutboxOps` vivem em
// `src/shared/outbox` (CORE-OUTBOX-WORKER-GENERIC) — antes duplicados aqui e no
// `partners`. Re-exportados para preservar os imports do módulo (adapter Drizzle,
// worker, testes de fronteira) sem que estes precisem conhecer o `shared/outbox`.
export type {
  OutboxRow,
  OutboxQueryError,
  OutboxQueryUnavailable,
  OutboxEventNotFound,
  OutboxBatchOps,
  WorkerOutboxOps,
} from '#src/shared/outbox/index.ts';
export { outboxQueryUnavailable, outboxEventNotFound } from '#src/shared/outbox/index.ts';

// ─── Tagged errors (Padrão D) — append ─────────────────────────────────────────

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
 * a versão Drizzle usa `appendInTx(tx, events)` internamente mas expõe este
 * port público simples para os testes contratuais.
 */
export type OutboxPort = Readonly<{
  append: (events: readonly ContractsModuleEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
