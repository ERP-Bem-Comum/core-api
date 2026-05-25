import process from 'node:process';

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import type { EventDelivery, ProcessedEvent } from '../application/ports/event-delivery.ts';
import type { Clock } from '../../../shared/ports/clock.ts';
import { outboxRowToEvent, type OutboxRow } from '../adapters/persistence/mappers/outbox.mapper.ts';
import type { OutboxQueryError } from '../adapters/persistence/repos/outbox-repository.drizzle.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerConfig = Readonly<{
  /** Quantos eventos por iteração. Default recomendado: 10. */
  batchSize: number;
  /** Número máximo de tentativas antes de mover para DLQ. Default recomendado: 5. */
  maxAttempts: number;
  /** Sleep entre rounds quando houve trabalho (ms). Default recomendado: 500. */
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
 * WorkerOutboxOps — os 4 helpers que o worker precisa do adapter de outbox.
 *
 * Exportado separadamente para que `CliContext` possa referenciar este tipo
 * sem importar `WorkerDeps` inteiro (que puxa `EventDelivery` e `Clock`).
 */
export type WorkerOutboxOps = Readonly<{
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

/**
 * WorkerDeps — dependências injetadas no worker.
 *
 * `outbox` expõe os 4 auxiliares do worker com a mesma interface do adapter
 * Drizzle (`findPendingForUpdate`, `markProcessed`, `markFailed`, `moveToDeadLetter`).
 * Isso permite que testes unit usem `InMemoryOutbox` e testes integration usem
 * `createDrizzleOutboxRepository` — sem alteração no worker.
 *
 * `abortSignal` é opcional: quando ausente, `runLoop` roda indefinidamente até
 * erro crítico. Em produção, passar o signal do SIGTERM handler.
 */
export type WorkerDeps = Readonly<{
  outbox: WorkerOutboxOps;
  delivery: EventDelivery;
  clock: Clock;
  abortSignal?: AbortSignal;
}>;

// ─── sleep helper ─────────────────────────────────────────────────────────────

/**
 * sleep — aguarda `ms` milissegundos respeitando o AbortSignal.
 *
 * Cancela imediatamente se o signal já estiver abortado.
 * Cancela o setTimeout quando o signal for abortado durante o sleep.
 * Resolve silenciosamente (sem lançar) — o loop verificará `signal.aborted`
 * na próxima iteração do `while`.
 *
 * Baseado no padrão canônico Node 24 para graceful shutdown via AbortSignal
 * (handbook/reference/nodejs/ — AbortController/AbortSignal).
 */
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

// ─── runOnce ──────────────────────────────────────────────────────────────────

/**
 * runOnce — executa UMA iteração do worker de outbox.
 *
 * Fluxo:
 *   1. SELECT pendentes com FOR UPDATE SKIP LOCKED (até batchSize).
 *   2. Para cada row:
 *      a. `outboxRowToEvent` (deserializar payload).
 *      b. `delivery.deliver(processedEvent)`.
 *      c. ok    → `markProcessed`.
 *         err   → `attempts + 1`:
 *           - se `newAttempt >= maxAttempts` → `moveToDeadLetter`.
 *           - senão → `markFailed`.
 *      d. Payload corrupto (mapper retorna err) → `moveToDeadLetter` direto,
 *         sem incrementar attempt (não é falha de delivery).
 *
 * Retorna:
 *   - `ok(WorkerStats)` com contadores da iteração.
 *   - `err(OutboxQueryError)` se a leitura inicial falhar (erro crítico de I/O).
 *
 * Erros em `markProcessed`/`markFailed`/`moveToDeadLetter` são logados e
 * ignorados (best-effort) — o worker não aborta por falha de marcação.
 */
export const runOnce = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<Result<WorkerStats, OutboxQueryError>> => {
  // 1. Ler pendentes — falha crítica se o banco não responde.
  const pendingResult = await deps.outbox.findPendingForUpdate(config.batchSize);
  if (!pendingResult.ok) return err(pendingResult.error);

  const rows = pendingResult.value;

  let delivered = 0;
  let failed = 0;
  let dlqMoved = 0;

  for (const row of rows) {
    // 2a. Deserializar payload.
    const eventResult = outboxRowToEvent(row);

    if (!eventResult.ok) {
      // Payload corrupto → DLQ direto (sem incrementar attempt — não é retry de delivery).
      const dlqResult = await deps.outbox.moveToDeadLetter(
        row.eventId,
        deps.clock.now(),
        `mapper-error: ${eventResult.error.tag}`,
      );
      if (!dlqResult.ok) {
        process.stderr.write(
          `[outbox-worker] moveToDeadLetter(corrupt) failed for ${row.eventId}: ${dlqResult.error.tag}\n`,
        );
      }
      dlqMoved += 1;
      continue;
    }

    // 2b. Montar ProcessedEvent e entregar.
    const processed: ProcessedEvent = {
      eventId: row.eventId,
      eventType: row.eventType,
      schemaVersion: row.schemaVersion,
      event: eventResult.value,
    };

    const deliveryResult = await deps.delivery.deliver(processed);

    if (deliveryResult.ok) {
      // 2c-ok. Marcar como processado.
      const markResult = await deps.outbox.markProcessed(row.eventId, deps.clock.now());
      if (!markResult.ok) {
        process.stderr.write(
          `[outbox-worker] markProcessed failed for ${row.eventId}: ${markResult.error.tag}\n`,
        );
      }
      delivered += 1;
    } else {
      // 2c-err. Incrementar attempts; rotear para DLQ se atingiu maxAttempts.
      const newAttempt = row.attempts + 1;

      if (newAttempt >= config.maxAttempts) {
        const dlqResult = await deps.outbox.moveToDeadLetter(
          row.eventId,
          deps.clock.now(),
          `delivery-error: ${deliveryResult.error.tag}`,
        );
        if (!dlqResult.ok) {
          process.stderr.write(
            `[outbox-worker] moveToDeadLetter failed for ${row.eventId}: ${dlqResult.error.tag}\n`,
          );
        }
        dlqMoved += 1;
      } else {
        const failResult = await deps.outbox.markFailed(
          row.eventId,
          deps.clock.now(),
          deliveryResult.error.tag,
          newAttempt,
        );
        if (!failResult.ok) {
          process.stderr.write(
            `[outbox-worker] markFailed failed for ${row.eventId}: ${failResult.error.tag}\n`,
          );
        }
        failed += 1;
      }
    }
  }

  return ok({ iterations: 1, delivered, failed, movedToDeadLetter: dlqMoved });
};

// ─── runLoop ──────────────────────────────────────────────────────────────────

/**
 * runLoop — loop infinito que chama `runOnce` até `abortSignal.aborted`.
 *
 * Backoff inteligente:
 *   - Outbox vazia (delivered=0 e failed=0): sleep `idleSleepMs` (mais longo).
 *   - Houve trabalho: sleep `pollIntervalMs` (mais curto — próxima iteração logo).
 *
 * Comportamento em erro crítico (`runOnce` retorna `err`):
 *   - Loga no stderr.
 *   - Sleep `pollIntervalMs` + continua (não aborta o loop automaticamente).
 *   - Callers que precisam de circuit-breaker devem envolver esta função.
 *
 * Retorna `WorkerStats` acumulado quando o signal é abortado.
 * Se `abortSignal` for undefined, roda indefinidamente (uso: processo dedicado).
 */
export const runLoop = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<WorkerStats> => {
  let totals: WorkerStats = { iterations: 0, delivered: 0, failed: 0, movedToDeadLetter: 0 };

  while (deps.abortSignal?.aborted !== true) {
    const round = await runOnce(deps, config);

    if (!round.ok) {
      // Erro crítico de I/O — log + backoff antes de retry.
      process.stderr.write(`[outbox-worker] runOnce failed: ${round.error.tag}\n`);
      await sleep(config.pollIntervalMs, deps.abortSignal);
      continue;
    }

    // Acumular totais.
    totals = {
      iterations: totals.iterations + round.value.iterations,
      delivered: totals.delivered + round.value.delivered,
      failed: totals.failed + round.value.failed,
      movedToDeadLetter: totals.movedToDeadLetter + round.value.movedToDeadLetter,
    };

    // Backoff inteligente: idle quando nada foi entregue nem falhou.
    const wasIdle =
      round.value.delivered === 0 &&
      round.value.failed === 0 &&
      round.value.movedToDeadLetter === 0;
    const sleepMs = wasIdle ? (config.idleSleepMs ?? config.pollIntervalMs) : config.pollIntervalMs;

    await sleep(sleepMs, deps.abortSignal);
  }

  return totals;
};
