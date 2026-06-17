/**
 * Worker de outbox do `partners` — wrapper fino sobre o worker genérico
 * (`src/shared/outbox`, CORE-OUTBOX-WORKER-GENERIC). Específico do módulo: `rowToProcessed`
 * monta o `ProcessedEvent` direto da row (payload OPACO — sem desserialização; nunca falha).
 *
 * ADR-0015 (outbox). Graceful shutdown via AbortSignal (Node 24).
 */
import { type Result, ok } from '#src/shared/primitives/result.ts';
import { runOnce as genericRunOnce, runLoop as genericRunLoop } from '#src/shared/outbox/index.ts';
import type {
  WorkerOutboxOps,
  WorkerConfig,
  WorkerStats,
  OutboxQueryError,
  RowToProcessed,
} from '#src/shared/outbox/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { EventDelivery, ProcessedEvent } from '../application/ports/event-delivery.ts';

export type { WorkerConfig, WorkerStats } from '#src/shared/outbox/index.ts';

/** Dependências do worker do partners (assinatura estável para run.ts e testes). */
export type WorkerDeps = Readonly<{
  outbox: WorkerOutboxOps;
  delivery: EventDelivery;
  clock: Clock;
  abortSignal?: AbortSignal;
}>;

const TAG = '[partners-outbox-worker] ';

// Específico do partners: payload opaco — monta o ProcessedEvent direto da row (sempre ok).
const rowToProcessed: RowToProcessed<ProcessedEvent> = (row) =>
  ok({
    eventId: row.eventId,
    eventType: row.eventType,
    aggregateId: row.aggregateId,
    aggregateType: row.aggregateType,
    schemaVersion: row.schemaVersion,
    occurredAt: row.occurredAt,
    payload: row.payload,
  });

export const runOnce = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<Result<WorkerStats, OutboxQueryError>> =>
  genericRunOnce<ProcessedEvent>({ ...deps, rowToProcessed, tag: TAG }, config);

export const runLoop = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<WorkerStats> =>
  genericRunLoop<ProcessedEvent>({ ...deps, rowToProcessed, tag: TAG }, config);
