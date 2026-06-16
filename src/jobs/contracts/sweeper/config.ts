// Config do job one-shot de auto-expire lida do AMBIENTE (12-factor) — sem CLI flags.
// Espelha o estilo de `src/modules/contracts/worker/config.ts` (`readWorkerConfig`):
// função pura que recebe `env` como argumento → testável sem tocar `process.env`.
//
// ADR-0041: entrypoint one-shot — config → conexão → executa → fecha pool → exit.

import { readFileSync } from 'node:fs';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

export type JobConfig = Readonly<{
  /** Connection string MySQL (writer) — lê/escreve `ctr_contracts` + `ctr_outbox`. */
  connectionString: string;
  /** Teto do lote por disparo (pré-fetch). O adapter usa `SELECT … LIMIT` simples (sem `FOR UPDATE` — ADR-0041). */
  batchSize: number;
}>;

export type JobConfigError =
  | 'sweeper-missing-connection-string'
  | 'sweeper-invalid-batch-size'
  | 'sweeper-ambiguous-connection-config'
  | 'sweeper-unreadable-connection-file';

const DEFAULT_BATCH_SIZE = 500;

// CTR-SWEEPER-DBURL-FILE (decisão CA5 #50): a connection string pode vir de um Docker
// secret via `CONTRACTS_DATABASE_URL_FILE`. A leitura é injetada como dependência para
// `readJobConfig` continuar pura/testável; o default real lê com `readFileSync` (síncrono
// no boot one-shot é idiomático) e remove o trailing `\n` que ferramentas de secret deixam.
export type ConnectionFileReader = (path: string) => Result<string, 'unreadable'>;

export const defaultConnectionFileReader: ConnectionFileReader = (path) => {
  try {
    return ok(readFileSync(path, 'utf8').trim());
  } catch {
    return err('unreadable');
  }
};

const isSet = (raw: string | undefined): raw is string => raw !== undefined && raw !== '';

const positiveIntOr = (raw: string | undefined, fallback: number): number | null => {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Resolve a connection string de UMA das duas fontes mutuamente exclusivas
// (`CONTRACTS_DATABASE_URL` direta XOR `CONTRACTS_DATABASE_URL_FILE`).
const resolveConnectionString = (
  env: Readonly<Record<string, string | undefined>>,
  readFile: ConnectionFileReader,
): Result<string, JobConfigError> => {
  const direct = env['CONTRACTS_DATABASE_URL'];
  const filePath = env['CONTRACTS_DATABASE_URL_FILE'];

  if (isSet(direct) && isSet(filePath)) return err('sweeper-ambiguous-connection-config');
  if (isSet(direct)) return ok(direct);
  if (isSet(filePath)) {
    const read = readFile(filePath);
    if (!read.ok) return err('sweeper-unreadable-connection-file');
    if (read.value === '') return err('sweeper-unreadable-connection-file');
    return ok(read.value);
  }
  return err('sweeper-missing-connection-string');
};

/**
 * Lê a configuração do job do ambiente.
 *
 * Connection string (mutuamente exclusivo — ADR-0026 / decisão CA5 #50):
 *   `CONTRACTS_DATABASE_URL`      — string de conexão direta; OU
 *   `CONTRACTS_DATABASE_URL_FILE` — path de Docker secret com a string completa.
 *   Ambos setados → `sweeper-ambiguous-connection-config`; nenhum → `sweeper-missing-connection-string`.
 * `SWEEP_BATCH_SIZE` — opcional; inteiro positivo; default 500.
 */
export const readJobConfig = (
  env: Readonly<Record<string, string | undefined>>,
  readFile: ConnectionFileReader = defaultConnectionFileReader,
): Result<JobConfig, JobConfigError> => {
  const connection = resolveConnectionString(env, readFile);
  if (!connection.ok) return connection;

  const batchSize = positiveIntOr(env['SWEEP_BATCH_SIZE'], DEFAULT_BATCH_SIZE);
  if (batchSize === null) return err('sweeper-invalid-batch-size');

  return ok({ connectionString: connection.value, batchSize });
};
