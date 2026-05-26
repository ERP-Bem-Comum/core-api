import process from 'node:process';

import { type Result, err } from '../../../shared/primitives/result.ts';
import {
  withNewCorrelation,
  currentCorrelationId,
} from '../../../shared/observability/correlation.ts';
import type { EventDelivery, ProcessedEvent } from '../application/ports/event-delivery.ts';
import { deliveryUnavailable } from '../application/ports/event-delivery.ts';
import type { Clock } from '../../../shared/ports/clock.ts';
import { outboxRowToEvent, type OutboxRow } from '../adapters/persistence/mappers/outbox.mapper.ts';
import type { OutboxQueryError } from '../application/ports/outbox.ts';

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
 * OutboxBatchOps — operações de marcação ligadas à transação do batch corrente.
 *
 * Passadas ao handler de `withPendingBatch` para que a marcação (`markProcessed`
 * etc.) ocorra na MESMA transação que travou as rows via `FOR UPDATE SKIP LOCKED`.
 * É isso que dá efeito ao SKIP LOCKED entre workers concorrentes (CTR-OUTBOX-SKIPLOCKED-DUP):
 * o lock sobrevive até o COMMIT, depois do delivery + marcação.
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
 *
 * Exportado separadamente para que `CliContext` possa referenciar este tipo
 * sem importar `WorkerDeps` inteiro (que puxa `EventDelivery` e `Clock`).
 */
export type WorkerOutboxOps = Readonly<{
  withPendingBatch: <R>(
    limit: number,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
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

// ─── log tag ──────────────────────────────────────────────────────────────────

/**
 * workerTag — prefixo dos logs do worker, anexando o correlation-id da iteração
 * quando há escopo ativo (ver `runLoop` → `withNewCorrelation`). Fora de escopo
 * (ex.: `runOnce` chamado direto em teste) mantém o prefixo simples.
 */
const workerTag = (): string => {
  const id = currentCorrelationId();
  return id === undefined ? '[outbox-worker] ' : `[outbox-worker ${id}] `;
};

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
  // O batch inteiro roda numa única transação: o `FOR UPDATE SKIP LOCKED` que trava
  // as rows (dentro de `withPendingBatch`) só isola workers concorrentes se o lock
  // sobreviver até a marcação. Por isso delivery + markProcessed ocorrem aqui dentro,
  // antes do COMMIT (CTR-OUTBOX-SKIPLOCKED-DUP). Erro crítico de I/O → tx rollback → err.
  return deps.outbox.withPendingBatch(config.batchSize, async (rows, ops) => {
    let delivered = 0;
    let failed = 0;
    let dlqMoved = 0;

    for (const row of rows) {
      // 2a. Deserializar payload.
      const eventResult = outboxRowToEvent(row);

      if (!eventResult.ok) {
        // Payload corrupto → DLQ direto (sem incrementar attempt — não é retry de delivery).
        const dlqResult = await ops.moveToDeadLetter(
          row.eventId,
          deps.clock.now(),
          `mapper-error: ${eventResult.error.tag}`,
        );
        if (!dlqResult.ok) {
          process.stderr.write(
            `${workerTag()}moveToDeadLetter(corrupt) failed for ${row.eventId}: ${dlqResult.error.tag}\n`,
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

      // Guard: um adapter de delivery mal-comportado que LANCE (em vez de retornar
      // err) não pode propagar para fora do handler — isso abortaria a transação e
      // faria rollback do batch inteiro já entregue. Convertemos throw → err aqui,
      // tratando como falha de delivery comum (markFailed/DLQ). (CTR-OUTBOX-SKIPLOCKED-DUP)
      const deliveryResult = await deps.delivery.deliver(processed).catch((cause: unknown) => {
        process.stderr.write(`${workerTag()}delivery threw for ${row.eventId}: ${String(cause)}\n`);
        return err(deliveryUnavailable(`deliver-threw: ${String(cause)}`));
      });

      if (deliveryResult.ok) {
        // 2c-ok. Marcar como processado (mesma tx do claim).
        const markResult = await ops.markProcessed(row.eventId, deps.clock.now());
        if (!markResult.ok) {
          process.stderr.write(
            `${workerTag()}markProcessed failed for ${row.eventId}: ${markResult.error.tag}\n`,
          );
        }
        delivered += 1;
      } else {
        // 2c-err. Incrementar attempts; rotear para DLQ se atingiu maxAttempts.
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
    // Cada iteração roda num escopo de correlação próprio: todos os logs do
    // worker (runOnce + o log de erro abaixo) compartilham o mesmo id rastreável.
    const round = await withNewCorrelation(async () => {
      const r = await runOnce(deps, config);
      if (!r.ok) {
        // Erro crítico de I/O — log dentro do escopo para carregar o id.
        process.stderr.write(`${workerTag()}runOnce failed: ${r.error.tag}\n`);
      }
      return r;
    });

    if (!round.ok) {
      // Backoff antes de retry. Sleep fora do escopo — intervalo entre batches.
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
