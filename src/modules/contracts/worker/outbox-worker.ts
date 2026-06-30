/**
 * Worker de outbox do `contracts` — wrapper fino sobre o worker genérico
 * (`src/shared/outbox`, CORE-OUTBOX-WORKER-GENERIC). O único específico do módulo é
 * `rowToProcessed`: desserializa o payload via `outboxRowToEvent` (payload corrupto → DLQ).
 *
 * ADR-0015 (outbox). Graceful shutdown via AbortSignal (Node 24).
 */
import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { runOnce as genericRunOnce, runLoop as genericRunLoop } from '#src/shared/outbox/index.ts';
import type {
  WorkerOutboxOps,
  WorkerConfig,
  WorkerStats,
  OutboxQueryError,
  RowToProcessed,
} from '#src/shared/outbox/index.ts';
import type { Clock } from '../../../shared/ports/clock.ts';
import type { EventDelivery, ProcessedEvent } from '../application/ports/event-delivery.ts';
import { outboxRowToEvent } from '../adapters/persistence/mappers/outbox.mapper.ts';

export type { WorkerConfig, WorkerStats } from '#src/shared/outbox/index.ts';

/** Dependências do worker do contracts (assinatura estável para run.ts e testes). */
export type WorkerDeps = Readonly<{
  outbox: WorkerOutboxOps;
  delivery: EventDelivery;
  clock: Clock;
  abortSignal?: AbortSignal;
}>;

const TAG = '[contracts-outbox-worker] ';

// Específico do contracts: desserializa o payload em evento de domínio (corrupto → DLQ).
const rowToProcessed: RowToProcessed<ProcessedEvent> = (row) => {
  const decoded = outboxRowToEvent(row);
  if (!decoded.ok) return err({ tag: decoded.error.tag });
  return ok({
    eventId: row.eventId,
    eventType: row.eventType,
    schemaVersion: row.schemaVersion,
    event: decoded.value,
  });
};

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
