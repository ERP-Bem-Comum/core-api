// Config do job one-shot de auto-expire lida do AMBIENTE (12-factor) — sem CLI flags.
// Espelha o estilo de `src/modules/contracts/worker/config.ts` (`readWorkerConfig`):
// função pura que recebe `env` como argumento → testável sem tocar `process.env`.
//
// ADR-0041: entrypoint one-shot — config → conexão → executa → fecha pool → exit.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

export type JobConfig = Readonly<{
  /** Connection string MySQL (writer) — lê/escreve `ctr_contracts` + `ctr_outbox`. */
  connectionString: string;
  /** Teto do lote por disparo (pré-fetch). O adapter usa `SELECT … LIMIT` simples (sem `FOR UPDATE` — ADR-0041). */
  batchSize: number;
}>;

export type JobConfigError = 'sweeper-missing-connection-string' | 'sweeper-invalid-batch-size';

const DEFAULT_BATCH_SIZE = 500;

const positiveIntOr = (raw: string | undefined, fallback: number): number | null => {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Lê a configuração do job do ambiente.
 *
 * `CONTRACTS_DATABASE_URL` — obrigatório. Mesma env var do writer do módulo (ADR-0026).
 * `SWEEP_BATCH_SIZE`       — opcional; inteiro positivo; default 500.
 */
export const readJobConfig = (
  env: Readonly<Record<string, string | undefined>>,
): Result<JobConfig, JobConfigError> => {
  const connectionString = env['CONTRACTS_DATABASE_URL'];
  if (connectionString === undefined || connectionString === '') {
    return err('sweeper-missing-connection-string');
  }

  const batchSize = positiveIntOr(env['SWEEP_BATCH_SIZE'], DEFAULT_BATCH_SIZE);
  if (batchSize === null) return err('sweeper-invalid-batch-size');

  return ok({ connectionString, batchSize });
};
