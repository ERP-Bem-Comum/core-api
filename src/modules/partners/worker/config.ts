// Config do worker de outbox (partners) lida do AMBIENTE (12-factor).
// Replica `contracts/worker/config.ts`, trocando a env do writer:
//   CONTRACTS_DATABASE_URL → PARTNERS_DATABASE_URL (writer do módulo partners — ADR-0026).
// Função pura (recebe o env como argumento) → testável sem tocar process.env.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { WorkerConfig } from './outbox-worker.ts';

export type WorkerRuntimeConfig = Readonly<{
  /** Connection string do MySQL (writer) — o worker lê/atualiza `par_outbox`. */
  connectionString: string;
  /** Identificador do consumer para o `LoggerEventDelivery`. */
  consumerId: string;
  /** Caminho opcional do arquivo JSONL de log de delivery. */
  logFile: string | undefined;
  /** Parâmetros do loop (batch, retries, backoff). */
  loop: WorkerConfig;
}>;

export type WorkerConfigError =
  | 'worker-missing-connection-string'
  | 'worker-invalid-batch-size'
  | 'worker-invalid-max-attempts'
  | 'worker-invalid-poll-ms'
  | 'worker-invalid-idle-sleep-ms';

const positiveIntOr = (raw: string | undefined, fallback: number): number | null => {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Lê a config do worker do ambiente. `PARTNERS_DATABASE_URL` é obrigatório (mesma env do
 * writer pool do módulo — ADR-0026). Os `OUTBOX_*` são opcionais com defaults seguros.
 */
export const readWorkerConfig = (
  env: Readonly<Record<string, string | undefined>>,
): Result<WorkerRuntimeConfig, WorkerConfigError> => {
  const connectionString = env['PARTNERS_DATABASE_URL'];
  if (connectionString === undefined || connectionString === '') {
    return err('worker-missing-connection-string');
  }

  const batchSize = positiveIntOr(env['OUTBOX_BATCH_SIZE'], 10);
  if (batchSize === null) return err('worker-invalid-batch-size');
  const maxAttempts = positiveIntOr(env['OUTBOX_MAX_ATTEMPTS'], 5);
  if (maxAttempts === null) return err('worker-invalid-max-attempts');
  const pollIntervalMs = positiveIntOr(env['OUTBOX_POLL_MS'], 100);
  if (pollIntervalMs === null) return err('worker-invalid-poll-ms');
  const idleSleepMs = positiveIntOr(env['OUTBOX_IDLE_SLEEP_MS'], 500);
  if (idleSleepMs === null) return err('worker-invalid-idle-sleep-ms');

  const consumerId =
    env['OUTBOX_CONSUMER_ID'] !== undefined && env['OUTBOX_CONSUMER_ID'] !== ''
      ? env['OUTBOX_CONSUMER_ID']
      : 'partners-outbox-logger-default';
  const logFile =
    env['OUTBOX_LOG_FILE'] !== undefined && env['OUTBOX_LOG_FILE'] !== ''
      ? env['OUTBOX_LOG_FILE']
      : undefined;

  return ok({
    connectionString,
    consumerId,
    logFile,
    loop: { batchSize, maxAttempts, pollIntervalMs, idleSleepMs },
  });
};
