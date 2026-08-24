/**
 * Tipos canônicos do outbox compartilhados entre módulos (CORE-OUTBOX-WORKER-GENERIC).
 *
 * Antes duplicados em `contracts/application/ports/outbox.ts` e `partners/.../outbox.ts`
 * (shapes idênticos). Vivem aqui para que o worker genérico (`outbox-worker.ts`) e os
 * adapters de cada módulo dependam de UM contrato. Cada módulo re-exporta estes tipos
 * dos seus ports, preservando os imports existentes (ADR-0015, ADR-0006).
 *
 * `EventDelivery<P>` é genérico no envelope `P` (o "processed event"): `contracts`
 * desserializa o payload (`P` carrega o evento de domínio); `partners` usa payload opaco.
 */
import type { Result } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';

// ─── OutboxRow (linha canônica — visão do consumidor) ─────────────────────────

export type OutboxRow = Readonly<{
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: Date;
  enqueuedAt: Date;
  /**
   * ⚠️ Coluna GLOBAL da linha do outbox — não diz nada sobre um consumidor específico. Sob fanout
   * ela é, no máximo, "alguém já processou". A pergunta que importa ("ESTE consumidor já
   * processou?") se responde em `eventos_processados`, via `isPendingForConsumer`. Foi confundir
   * as duas que produziu `pendentes = 0` com linha faltando na projeção.
   */
  processedAt: Date | null;
  /** Tentativas DESTE consumidor, lidas do progresso — nunca o contador global da linha. */
  attempts: number;
  payload: string;
}>;

// ─── Erros de consumo (worker) ────────────────────────────────────────────────

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

// ─── Contrato de consumo do outbox (worker) ───────────────────────────────────

/**
 * Dados de uma entrega malsucedida, agrupados.
 *
 * Existem como objeto, e não como três parâmetros soltos, porque `markFailed` passou a levar
 * também o `consumerId` (#800, #824) e chegou a cinco posicionais — acima do `max-params` do
 * projeto. A saída fácil seria `eslint-disable`; a regra, porém, estava certa: `(consumerId,
 * eventId, now, errorTag, attempt)` é uma sequência de três valores do mesmo tipo primitivo em
 * que trocar dois de lugar compila e falha em silêncio. Nomeados, não trocam.
 */
export type OutboxFailure = Readonly<{
  now: Date;
  errorTag: string;
  attempt: number;
}>;

export type OutboxBatchOps = Readonly<{
  markProcessed: (eventId: string, now: Date) => Promise<Result<void, OutboxQueryError>>;
  markFailed: (eventId: string, failure: OutboxFailure) => Promise<Result<void, OutboxQueryError>>;
  moveToDeadLetter: (
    eventId: string,
    now: Date,
    errorMessage: string,
  ) => Promise<Result<void, OutboxQueryError>>;
}>;

/**
 * Operações de consumo do outbox. **Toda** entrada leva `consumerId` (#800, #824): a pendência de
 * um evento não é global, é por consumidor — dois consumidores sobre a mesma tabela precisam,
 * cada um, de TODOS os eventos, e o desenho anterior os fazia dividir a fila.
 *
 * As ops de dentro de `withPendingBatch` (`OutboxBatchOps`) NÃO repetem o `consumerId`: elas já
 * nascem ligadas ao consumidor daquele batch. Repeti-lo lá abriria a porta para marcar o
 * progresso de um consumidor com o id de outro — um erro que o tipo não pegaria.
 */
export type WorkerOutboxOps = Readonly<{
  withPendingBatch: <R>(
    consumerId: string,
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ) => Promise<Result<R, OutboxQueryError>>;
  findPendingForUpdate: (
    consumerId: string,
    limit: number,
  ) => Promise<Result<readonly OutboxRow[], OutboxQueryError>>;
  markProcessed: (
    consumerId: string,
    eventId: string,
    now: Date,
  ) => Promise<Result<void, OutboxQueryError>>;
  markFailed: (
    consumerId: string,
    eventId: string,
    failure: OutboxFailure,
  ) => Promise<Result<void, OutboxQueryError>>;
  moveToDeadLetter: (
    consumerId: string,
    eventId: string,
    now: Date,
    errorMessage: string,
  ) => Promise<Result<void, OutboxQueryError>>;
}>;

// ─── Delivery (genérico no envelope P) ────────────────────────────────────────

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

/**
 * EventDelivery — driven port para entrega de um evento processado (`P`) a um consumer.
 * `P` varia por módulo: `contracts` carrega o evento de domínio desserializado;
 * `partners` carrega o payload opaco. `consumerId` identifica o consumer (logs/idempotência).
 */
export type EventDelivery<P> = Readonly<{
  consumerId: string;
  deliver: (event: P) => Promise<Result<void, DeliveryError>>;
}>;

// ─── Worker (config, stats, deps genéricas) ───────────────────────────────────

export type WorkerConfig = Readonly<{
  batchSize: number;
  maxAttempts: number;
  pollIntervalMs: number;
  idleSleepMs?: number;
}>;

export type WorkerStats = Readonly<{
  iterations: number;
  delivered: number;
  failed: number;
  movedToDeadLetter: number;
}>;

/** Mapeia a row do outbox no envelope `P`. Erro (payload corrupto) → DLQ direto. */
export type RowToProcessed<P> = (row: OutboxRow) => Result<P, { tag: string }>;

/**
 * Dependências do worker genérico. `rowToProcessed` e `tag` são o ponto de variação
 * entre os módulos; o resto (`outbox`, `delivery`, `clock`, `abortSignal`) é injetado igual.
 */
export type SharedWorkerDeps<P> = Readonly<{
  outbox: WorkerOutboxOps;
  delivery: EventDelivery<P>;
  rowToProcessed: RowToProcessed<P>;
  clock: Clock;
  /** Prefixo de log do worker (ex.: `'[contracts-outbox-worker] '`). */
  tag: string;
  abortSignal?: AbortSignal;
}>;
