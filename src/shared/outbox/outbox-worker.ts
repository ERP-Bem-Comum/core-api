/**
 * Worker de outbox genérico (CORE-OUTBOX-WORKER-GENERIC).
 *
 * `runOnce<P>`/`runLoop<P>` — antes duplicados em contracts/partners (lógica idêntica).
 * O único ponto de variação é `rowToProcessed` (desserializar vs payload opaco), injetado
 * via `SharedWorkerDeps`. Claim com `FOR UPDATE SKIP LOCKED` (via `withPendingBatch`),
 * delivery + marcação na MESMA transação, retry com `attempts`, DLQ ao atingir `maxAttempts`,
 * backoff inteligente, graceful shutdown via `AbortSignal`. (ADR-0015, ADR-0041.)
 */
import process from 'node:process';

import { type Result, err } from '#src/shared/primitives/result.ts';
import { withNewCorrelation, currentCorrelationId } from '#src/shared/observability/correlation.ts';
import { deliveryUnavailable } from './types.ts';
import type { SharedWorkerDeps, WorkerConfig, WorkerStats, OutboxQueryError } from './types.ts';

// ─── sleep helper (cancelável por AbortSignal — padrão Node 24) ────────────────

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

// ─── log tag (anexa correlation-id quando há escopo ativo) ─────────────────────

const taggedLog = (baseTag: string): string => {
  const id = currentCorrelationId();
  return id === undefined ? baseTag : `${baseTag}(${id}) `;
};

// ─── runOnce ──────────────────────────────────────────────────────────────────

/**
 * runOnce — uma iteração: claim batch (SKIP LOCKED) → para cada row:
 *   1. `rowToProcessed(row)`. err → `moveToDeadLetter` direto (payload corrupto, sem attempt).
 *   2. `delivery.deliver(processed)` (throw é convertido em err — não aborta o batch).
 *      ok  → `markProcessed`.
 *      err → `attempts+1`: `>= maxAttempts` → DLQ; senão `markFailed`.
 * Erros de marcação são best-effort (logados). Erro crítico de I/O na leitura → `err`.
 */
export const runOnce = async <P>(
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: SharedWorkerDeps<P>,
  config: WorkerConfig,
): Promise<Result<WorkerStats, OutboxQueryError>> => {
  return deps.outbox.withPendingBatch(config.batchSize, async (rows, ops) => {
    let delivered = 0;
    let failed = 0;
    let dlqMoved = 0;

    for (const row of rows) {
      const mapped = deps.rowToProcessed(row);
      if (!mapped.ok) {
        const dlqResult = await ops.moveToDeadLetter(
          row.eventId,
          deps.clock.now(),
          `mapper-error: ${mapped.error.tag}`,
        );
        if (!dlqResult.ok) {
          process.stderr.write(
            `${taggedLog(deps.tag)}moveToDeadLetter(corrupt) failed for ${row.eventId}: ${dlqResult.error.tag}\n`,
          );
        }
        dlqMoved += 1;
        continue;
      }

      const deliveryResult = await deps.delivery.deliver(mapped.value).catch((cause: unknown) => {
        process.stderr.write(
          `${taggedLog(deps.tag)}delivery threw for ${row.eventId}: ${String(cause)}\n`,
        );
        return err(deliveryUnavailable(`deliver-threw: ${String(cause)}`));
      });

      if (deliveryResult.ok) {
        const markResult = await ops.markProcessed(row.eventId, deps.clock.now());
        if (!markResult.ok) {
          process.stderr.write(
            `${taggedLog(deps.tag)}markProcessed failed for ${row.eventId}: ${markResult.error.tag}\n`,
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
              `${taggedLog(deps.tag)}moveToDeadLetter failed for ${row.eventId}: ${dlqResult.error.tag}\n`,
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
              `${taggedLog(deps.tag)}markFailed failed for ${row.eventId}: ${failResult.error.tag}\n`,
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
 * runLoop — chama `runOnce` até `abortSignal.aborted`. Backoff: idle → `idleSleepMs`;
 * com trabalho → `pollIntervalMs`. Erro crítico → log + sleep + continua. Acumula `WorkerStats`.
 */
export const runLoop = async <P>(
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: SharedWorkerDeps<P>,
  config: WorkerConfig,
): Promise<WorkerStats> => {
  let totals: WorkerStats = { iterations: 0, delivered: 0, failed: 0, movedToDeadLetter: 0 };

  while (deps.abortSignal?.aborted !== true) {
    const round = await withNewCorrelation(async () => {
      const r = await runOnce(deps, config);
      if (!r.ok) {
        process.stderr.write(`${taggedLog(deps.tag)}runOnce failed: ${r.error.tag}\n`);
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
