// OutboxPort do módulo `partners` — `append` recebe `OutboxMessage[]` já montadas (payload
// opaco), não eventos de domínio. Os tipos de CONSUMO (worker) são canônicos compartilhados
// em `src/shared/outbox` (CORE-OUTBOX-WORKER-GENERIC) — antes duplicados aqui e no contracts.
//
// ADR-0015 (outbox), ADR-0014 (par_* isolado), ADR-0006 (port = type).

import type { Result } from '#src/shared/primitives/result.ts';

// ─── Consumo do outbox (worker) — tipos canônicos compartilhados ──────────────
export type {
  OutboxRow,
  OutboxQueryError,
  OutboxQueryUnavailable,
  OutboxEventNotFound,
  OutboxBatchOps,
  WorkerOutboxOps,
} from '#src/shared/outbox/index.ts';
export { outboxQueryUnavailable, outboxEventNotFound } from '#src/shared/outbox/index.ts';

// ─── OutboxMessage (entrada genérica do append) ──────────────────────────────
//
// Mensagem já montada para enfileirar no outbox. `payload` é uma string opaca
// (JSON.stringify do evento de integração) — a infra não a interpreta.

export type OutboxMessage = Readonly<{
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  occurredAt: Date;
  payload: string;
}>;

// ─── Tagged errors (Padrão D) — append ───────────────────────────────────────

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
 * OutboxPort — driven port para persistência de mensagens no outbox do partners.
 *
 * Consumido pelo adapter de repositório (dentro da transação do agregado, via
 * `appendOutboxInTx`) ou diretamente em testes. A assinatura sem `tx` é intencional:
 * o InMemory funciona sem transação; a versão Drizzle usa `appendOutboxInTx(tx, ...)`
 * internamente mas expõe este port público simples para os testes contratuais.
 */
export type OutboxPort = Readonly<{
  append: (messages: readonly OutboxMessage[]) => Promise<Result<void, OutboxAppendError>>;
}>;
