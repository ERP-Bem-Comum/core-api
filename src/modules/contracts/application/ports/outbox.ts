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

// ─── OutboxQueryError (consumo — Padrão D) ────────────────────────────────────
//
// Erros do lado de leitura/consumo do outbox (worker). Vivem no port (não no
// adapter Drizzle) para que worker e adapters dependam do contrato, nunca o
// inverso — quebra o ciclo de import adapter↔worker (CTR-OUTBOX-SKIPLOCKED-DUP).

export type OutboxQueryUnavailable = Readonly<{ tag: 'OutboxQueryUnavailable'; cause: string }>;
export type OutboxEventNotFound = Readonly<{ tag: 'OutboxEventNotFound'; eventId: string }>;

export type OutboxQueryError = OutboxQueryUnavailable | OutboxEventNotFound;

export const outboxQueryUnavailable = (cause: string): OutboxQueryUnavailable => ({
  tag: 'OutboxQueryUnavailable',
  cause,
});

export const outboxEventNotFound = (eventId: string): OutboxEventNotFound => ({
  tag: 'OutboxEventNotFound',
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

// ─── OutboxRow (linha canônica do outbox) ─────────────────────────────────────
//
// Shape escalar de uma linha pendente/processada do outbox, do ponto de vista do
// CONSUMIDOR (worker). Mora no port — não em `adapters/persistence/` — para que o
// contrato de consumo (`WorkerOutboxOps`) não precise importar de `adapters/`
// (.claude/rules/application.md). O adapter Drizzle mantém `typeof
// ctrOutbox.$inferSelect` e trava a equivalência com este tipo por um guard
// type-level no mapper (CTR-OUTBOX-CONSUMER-PORT, CA4) — se o schema divergir, o
// typecheck quebra.

export type OutboxRow = Readonly<{
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: Date;
  enqueuedAt: Date;
  processedAt: Date | null;
  attempts: number;
  payload: string;
}>;

// ─── Contrato de consumo do outbox (worker) ───────────────────────────────────

/**
 * OutboxBatchOps — operações de marcação ligadas à transação do batch corrente.
 *
 * Passadas ao handler de `withPendingBatch` para que a marcação (`markProcessed`
 * etc.) ocorra na MESMA transação que travou as rows via `FOR UPDATE SKIP LOCKED`.
 * É isso que dá efeito ao SKIP LOCKED entre workers concorrentes
 * (CTR-OUTBOX-SKIPLOCKED-DUP): o lock sobrevive até o COMMIT, após delivery + marcação.
 */
export type OutboxBatchOps = Readonly<{
  markProcessed: (eventId: string, now: Date) => Promise<Result<void, OutboxQueryError>>;
  markFailed: (
    eventId: string,
    now: Date,
    errorTag: string,
    attempt: number,
  ) => Promise<Result<void, OutboxQueryError>>;
  moveToDeadLetter: (
    eventId: string,
    now: Date,
    errorMessage: string,
  ) => Promise<Result<void, OutboxQueryError>>;
}>;

/**
 * WorkerOutboxOps — o que o worker precisa do adapter de outbox.
 *
 * `withPendingBatch` é a operação canônica de consumo: abre uma transação, trava
 * até `limit` rows pendentes com `FOR UPDATE SKIP LOCKED`, e invoca o handler com
 * as rows + `OutboxBatchOps` ligadas à mesma transação. Commit ao fim do handler.
 *
 * Os 4 helpers diretos (`findPendingForUpdate`/`markProcessed`/...) permanecem para
 * inspeção e testes de unidade dos adapters — NÃO usar para consumo concorrente
 * (rodam em autocommit; o lock do SELECT não sobrevive ao statement).
 */
export type WorkerOutboxOps = Readonly<{
  withPendingBatch: <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ) => Promise<Result<R, OutboxQueryError>>;
  findPendingForUpdate: (limit: number) => Promise<Result<readonly OutboxRow[], OutboxQueryError>>;
  markProcessed: (eventId: string, now: Date) => Promise<Result<void, OutboxQueryError>>;
  markFailed: (
    eventId: string,
    now: Date,
    errorTag: string,
    attempt: number,
  ) => Promise<Result<void, OutboxQueryError>>;
  moveToDeadLetter: (
    eventId: string,
    now: Date,
    errorMessage: string,
  ) => Promise<Result<void, OutboxQueryError>>;
}>;
