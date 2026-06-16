// Worker de outbox do módulo `partners` — replica `contracts/worker/outbox-worker.ts`.
// A lógica é GENÉRICA (WorkerOutboxOps + EventDelivery): claim com FOR UPDATE SKIP LOCKED,
// deliver, markProcessed (idempotente), retry com attempts, maxAttempts → dead-letter,
// runLoop com backoff. Diferença vs contracts: o payload é OPACO (string) — não há
// desserialização de evento de domínio (outboxRowToEvent), então o worker monta o
// ProcessedEvent direto da row.
//
// ADR-0015 (outbox). Graceful shutdown via AbortSignal (Node 24).

import process from 'node:process';

import { type Result, err } from '#src/shared/primitives/result.ts';
import { withNewCorrelation, currentCorrelationId } from '#src/shared/observability/correlation.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { EventDelivery, ProcessedEvent } from '../application/ports/event-delivery.ts';
import { deliveryUnavailable } from '../application/ports/event-delivery.ts';
import type { WorkerOutboxOps, OutboxQueryError } from '../application/ports/outbox.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerConfig = Readonly<{
  /** Quantos eventos por iteração. Default recomendado: 10. */
  batchSize: number;
  /** Número máximo de tentativas antes de mover para DLQ. Default recomendado: 5. */
  maxAttempts: number;
  /** Sleep entre rounds quando houve trabalho (ms). */
  pollIntervalMs: number;
  /** Sleep especial quando a outbox estava vazia (ms). Default = pollIntervalMs. */
  idleSleepMs?: number;
}>;

export type WorkerStats = Readonly<{
  iterations: number;
  delivered: number;
  failed: number;
  movedToDeadLetter: number;
}>;

/**
 * WorkerDeps — dependências injetadas no worker.
 *
 * `outbox` expõe os auxiliares do worker com a mesma interface do adapter Drizzle e
 * do InMemory — testes unit usam InMemoryOutbox, integration usam o Drizzle.
 *
 * `abortSignal` é opcional: quando ausente, `runLoop` roda indefinidamente.
 */
export type WorkerDeps = Readonly<{
  outbox: WorkerOutboxOps;
  delivery: EventDelivery;
  clock: Clock;
  abortSignal?: AbortSignal;
}>;

// ─── sleep helper ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const sleep = async (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

// ─── log tag ──────────────────────────────────────────────────────────────────

const workerTag = (): string => {
  const id = currentCorrelationId();
  return id === undefined ? '[partners-outbox-worker] ' : `[partners-outbox-worker ${id}] `;
};

// ─── runOnce ──────────────────────────────────────────────────────────────────

/**
 * runOnce — executa UMA iteração do worker.
 *
 * Fluxo (numa única tx via withPendingBatch — o lock do SKIP LOCKED sobrevive até o COMMIT):
 *   1. SELECT pendentes com FOR UPDATE SKIP LOCKED (até batchSize).
 *   2. Para cada row: montar ProcessedEvent → delivery.deliver.
 *      ok  → markProcessed.
 *      err → attempts + 1: >= maxAttempts → moveToDeadLetter; senão markFailed.
 *
 * Erros em markProcessed/markFailed/moveToDeadLetter são logados e ignorados (best-effort).
 */
export const runOnce = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<Result<WorkerStats, OutboxQueryError>> => {
  return deps.outbox.withPendingBatch(config.batchSize, async (rows, ops) => {
    let delivered = 0;
    let failed = 0;
    let dlqMoved = 0;

    for (const row of rows) {
      // Montar ProcessedEvent direto da row — payload é opaco (sem desserialização).
      const processed: ProcessedEvent = {
        eventId: row.eventId,
        eventType: row.eventType,
        aggregateId: row.aggregateId,
        aggregateType: row.aggregateType,
        schemaVersion: row.schemaVersion,
        occurredAt: row.occurredAt,
        payload: row.payload,
      };

      // Guard: um adapter de delivery que LANCE não pode abortar a transação do batch.
      const deliveryResult = await deps.delivery.deliver(processed).catch((cause: unknown) => {
        process.stderr.write(`${workerTag()}delivery threw for ${row.eventId}: ${String(cause)}\n`);
        return err(deliveryUnavailable(`deliver-threw: ${String(cause)}`));
      });

      if (deliveryResult.ok) {
        const markResult = await ops.markProcessed(row.eventId, deps.clock.now());
        if (!markResult.ok) {
          process.stderr.write(
            `${workerTag()}markProcessed failed for ${row.eventId}: ${markResult.error.tag}\n`,
          );
        }
        delivered += 1;
      } else {
        const newAttempt = row.attempts + 1;

        if (newAttempt >= config.maxAttempts) {
          const dlqResult = await ops.moveToDeadLetter(
            row.eventId,
            deps.clock.now(),
            `delivery-error: ${deliveryResult.error.tag}`,
          );
          if (!dlqResult.ok) {
            process.stderr.write(
              `${workerTag()}moveToDeadLetter failed for ${row.eventId}: ${dlqResult.error.tag}\n`,
            );
          }
          dlqMoved += 1;
        } else {
          const failResult = await ops.markFailed(
            row.eventId,
            deps.clock.now(),
            deliveryResult.error.tag,
            newAttempt,
          );
          if (!failResult.ok) {
            process.stderr.write(
              `${workerTag()}markFailed failed for ${row.eventId}: ${failResult.error.tag}\n`,
            );
          }
          failed += 1;
        }
      }
    }

    return { iterations: 1, delivered, failed, movedToDeadLetter: dlqMoved };
  });
};

// ─── runLoop ──────────────────────────────────────────────────────────────────

/**
 * runLoop — loop infinito que chama `runOnce` até `abortSignal.aborted`.
 *
 * Backoff inteligente: outbox vazia → sleep `idleSleepMs`; houve trabalho → `pollIntervalMs`.
 * Erro crítico em `runOnce` → log + sleep `pollIntervalMs` + continua.
 * Retorna `WorkerStats` acumulado quando o signal é abortado.
 */
export const runLoop = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<WorkerStats> => {
  let totals: WorkerStats = { iterations: 0, delivered: 0, failed: 0, movedToDeadLetter: 0 };

  while (deps.abortSignal?.aborted !== true) {
    const round = await withNewCorrelation(async () => {
      const r = await runOnce(deps, config);
      if (!r.ok) {
        process.stderr.write(`${workerTag()}runOnce failed: ${r.error.tag}\n`);
      }
      return r;
    });

    if (!round.ok) {
      await sleep(config.pollIntervalMs, deps.abortSignal);
      continue;
    }

    totals = {
      iterations: totals.iterations + round.value.iterations,
      delivered: totals.delivered + round.value.delivered,
      failed: totals.failed + round.value.failed,
      movedToDeadLetter: totals.movedToDeadLetter + round.value.movedToDeadLetter,
    };

    const wasIdle =
      round.value.delivered === 0 &&
      round.value.failed === 0 &&
      round.value.movedToDeadLetter === 0;
    const sleepMs = wasIdle ? (config.idleSleepMs ?? config.pollIntervalMs) : config.pollIntervalMs;

    await sleep(sleepMs, deps.abortSignal);
  }

  return totals;
};
