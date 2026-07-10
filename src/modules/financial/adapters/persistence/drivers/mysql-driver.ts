// Driver runtime MySQL do módulo Financial — espelho de
// `contracts/adapters/persistence/drivers/mysql-driver.ts` (padrão estabelecido em
// CTR-DB-DRIVER-MYSQL). Responsabilidades idênticas:
//   - Abrir pool `mysql2/promise`, instanciar `drizzle-orm/mysql2`.
//   - Aplicar migrations (idempotente via journal drizzle-kit) se `applyMigrations=true`.
//   - Converter toda exceção de infra em `Result<FinancialMysqlHandle, FinancialMysqlDriverError>`.
//
// Isolamento de journal (ADR-0014): `__drizzle_migrations_financial` — tabela de
// controle separada de `__drizzle_migrations_contracts`. Garante que o migrator de
// um módulo não pule migrations do outro por comparação de timestamp.
//
// Tuning (espelha contratos §H3/M2/M5):
//   - `timezone: 'Z'`          → blinda Date↔DATETIME(3) contra drift de TZ.
//   - `idleTimeout: 270_000`   → alinhamento pool↔servidor (wait_timeout=300s).
//   - `applyMigrations` default `false` → prod-safe; CI/dev passam `true`.

import { createPool, type Pool, type PoolOptions } from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import {
  buildPoolOptions as buildSharedPoolOptions,
  type PoolConfigError,
} from '../../../../../shared/persistence/mysql-pool-config.ts';
import * as schema from '../schemas/mysql.ts';

export type FinancialMysqlConnectOptions = Readonly<{
  connectionString: string;
  applyMigrations?: boolean;
  poolLimit?: number;
  idleTimeoutMs?: number;
  // Override do teto de conexões ociosas mantidas. Default derivado (< connectionLimit).
  maxIdle?: number;
}>;

export type FinancialMysqlHandle = Readonly<{
  db: MySql2Database<typeof schema>;
  schema: typeof schema;
  close: () => Promise<void>;
}>;

export type FinancialMysqlDriverError =
  | 'financial-mysql-driver-connection-string-invalid'
  | 'financial-mysql-driver-connect-failed'
  | 'financial-mysql-driver-migrate-failed'
  | 'financial-mysql-driver-pool-config-invalid';

const CONNECTION_STRING_RE = /^mysql:\/\/[^/@\s]+(?::[^/@\s]*)?@[^/\s]+\/[^/?\s]+/;

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_FOLDER = resolve(HERE, '..', 'migrations', 'mysql');

// Delega ao builder compartilhado (src/shared/persistence/mysql-pool-config.ts), que garante
// `maxIdle < connectionLimit` por construção — sem isso o `idleTimeout` é inerte (Incident-0001).
export const buildPoolOptions = (
  opts: FinancialMysqlConnectOptions,
): Result<PoolOptions, PoolConfigError> =>
  buildSharedPoolOptions({
    connectionString: opts.connectionString,
    ...(opts.poolLimit !== undefined ? { connectionLimit: opts.poolLimit } : {}),
    ...(opts.idleTimeoutMs !== undefined ? { idleTimeoutMs: opts.idleTimeoutMs } : {}),
    ...(opts.maxIdle !== undefined ? { maxIdle: opts.maxIdle } : {}),
  });

const validateConnectionString = (s: string): Result<true, FinancialMysqlDriverError> => {
  if (!CONNECTION_STRING_RE.test(s)) return err('financial-mysql-driver-connection-string-invalid');
  return ok(true);
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const smokeCheck = async (pool: Pool): Promise<Result<true, FinancialMysqlDriverError>> => {
  try {
    await pool.query('SELECT 1');
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[financial-mysql-driver:smoke] ${String(cause)}\n`);
    return err('financial-mysql-driver-connect-failed');
  }
};

const createPoolSafe = (
  opts: FinancialMysqlConnectOptions,
): Result<Pool, FinancialMysqlDriverError> => {
  const cfg = buildPoolOptions(opts);
  if (!cfg.ok) {
    process.stderr.write(`[financial-mysql-driver:pool-config] ${cfg.error}\n`);
    return err('financial-mysql-driver-pool-config-invalid');
  }
  try {
    return ok(createPool(cfg.value));
  } catch (cause) {
    process.stderr.write(`[financial-mysql-driver:createPool] ${String(cause)}\n`);
    return err('financial-mysql-driver-connect-failed');
  }
};

const applyMigrationsTo = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  db: MySql2Database<typeof schema>,
): Promise<Result<true, FinancialMysqlDriverError>> => {
  try {
    await migrate(db, {
      migrationsFolder: MIGRATIONS_FOLDER,
      // ADR-0014: journal isolado por módulo (evita colisão de timestamp com outros módulos).
      migrationsTable: '__drizzle_migrations_financial',
    });
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[financial-mysql-driver:migrate] ${String(cause)}\n`);
    return err('financial-mysql-driver-migrate-failed');
  }
};

export const openMysqlFinancial = async (
  opts: FinancialMysqlConnectOptions,
): Promise<Result<FinancialMysqlHandle, FinancialMysqlDriverError>> => {
  const valR = validateConnectionString(opts.connectionString);
  if (!valR.ok) return valR;

  const poolR = createPoolSafe(opts);
  if (!poolR.ok) return poolR;
  const pool = poolR.value;

  const smokeR = await smokeCheck(pool);
  if (!smokeR.ok) {
    await pool.end().catch(() => undefined);
    return smokeR;
  }

  const db = drizzle(pool, { schema, mode: 'default' });

  if (opts.applyMigrations === true) {
    const migR = await applyMigrationsTo(db);
    if (!migR.ok) {
      await pool.end().catch(() => undefined);
      return migR;
    }
  }

  return ok({
    db,
    schema,
    close: async () => {
      await pool.end();
    },
  });
};
