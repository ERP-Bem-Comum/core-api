// OutboxPort do módulo `partners` — replica o padrão de `contracts/application/ports/outbox.ts`,
// mas GENÉRICO: `append` recebe `OutboxMessage[]` já montadas, não eventos de domínio. Quem monta a
// OutboxMessage (do SupplierEvent + agregado, com name/cnpj) é o ticket PAR-SUPPLIER-EVENTS — aqui a
// infra só persiste/entrega mensagens opacas. `aggregate_type` aceita só 'Supplier' por ora (CHECK no schema).
//
// ADR-0015 (outbox), ADR-0014 (par_* isolado), ADR-0006 (port = type). Erros de consumo (worker) vivem
// no port para quebrar o ciclo de import adapter↔worker.

import type { Result } from '#src/shared/primitives/result.ts';

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

// ─── Tagged errors (Padrão D) — consumo (worker) ─────────────────────────────
//
// Erros do lado de leitura/consumo do outbox (worker). Vivem no port (não no
// adapter Drizzle) para que worker e adapters dependam do contrato, nunca o
// inverso — quebra o ciclo de import adapter↔worker.

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

// ─── OutboxRow (linha canônica do outbox — visão do consumidor) ───────────────
//
// Shape escalar de uma linha pendente/processada do outbox, do ponto de vista do
// CONSUMIDOR (worker). Mora no port — não em `adapters/persistence/` — para que o
// contrato de consumo (`WorkerOutboxOps`) não precise importar de `adapters/`. O
// adapter Drizzle trava a equivalência com `typeof parOutbox.$inferSelect` por um
// guard type-level — se o schema divergir, o typecheck quebra.

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
 * É isso que dá efeito ao SKIP LOCKED entre workers concorrentes: o lock sobrevive
 * até o COMMIT, após delivery + marcação.
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
 * Os 4 helpers diretos permanecem para inspeção e testes de unidade — NÃO usar para
 * consumo concorrente (rodam em autocommit; o lock do SELECT não sobrevive ao statement).
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
