// EmailOutboxPort do modulo `partners` (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047). Outbox de e-mail
// DEDICADO (single-consumer email-dispatch), distinto do `par_outbox` de integracao. `append` recebe
// `OutboxMessage[]` ja montadas (payload opaco serializado), nao eventos de dominio. Os tipos de
// CONSUMO (worker) sao canonicos compartilhados em `#src/shared/outbox`; re-exportados aqui, igual
// `partners/application/ports/outbox.ts` e `auth/application/ports/outbox.ts`.
//
// ADR-0015 (outbox), ADR-0014 (par_* isolado), ADR-0006 (port = type).

import type { Result } from '#src/shared/primitives/result.ts';

// ─── Consumo do outbox (worker) — tipos canonicos compartilhados ──────────────
export type {
  OutboxRow,
  OutboxQueryError,
  OutboxQueryUnavailable,
  OutboxEventNotFound,
  OutboxBatchOps,
  WorkerOutboxOps,
} from '#src/shared/outbox/index.ts';
export { outboxQueryUnavailable, outboxEventNotFound } from '#src/shared/outbox/index.ts';

// ─── OutboxMessage (entrada generica do append) ──────────────────────────────
//
// Mensagem ja montada para enfileirar no outbox. `payload` e uma string opaca
// (JSON.stringify do evento) — a infra nao a interpreta.

export type OutboxMessage = Readonly<{
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  occurredAt: Date;
  payload: string;
}>;

// ─── Tagged errors (Padrao D) — append ───────────────────────────────────────

export type OutboxAppendUnavailable = Readonly<{ tag: 'OutboxAppendUnavailable' }>;
export type OutboxAppendDuplicateEventId = Readonly<{
  tag: 'OutboxAppendDuplicateEventId';
  eventId: string;
}>;

export type OutboxAppendError = OutboxAppendUnavailable | OutboxAppendDuplicateEventId;

export const outboxAppendUnavailable = (): OutboxAppendUnavailable => ({
  tag: 'OutboxAppendUnavailable',
});

export const outboxAppendDuplicateEventId = (eventId: string): OutboxAppendDuplicateEventId => ({
  tag: 'OutboxAppendDuplicateEventId',
  eventId,
});

// ─── Port ─────────────────────────────────────────────────────────────────────

/**
 * EmailOutboxPort — driven port para persistencia de mensagens no outbox de e-mail do partners.
 *
 * Consumido pelo adapter de repositorio (dentro da transacao do save, via `appendEmailOutboxInTx`)
 * ou diretamente em testes. A assinatura sem `tx` e intencional: o InMemory funciona sem transacao;
 * a versao Drizzle usa `appendEmailOutboxInTx(tx, ...)` internamente mas expoe este port simples.
 */
export type EmailOutboxPort = Readonly<{
  append: (messages: readonly OutboxMessage[]) => Promise<Result<void, OutboxAppendError>>;
}>;
