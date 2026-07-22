// Driver runtime MySQL para o módulo partners — espelha auth/contracts.
//
// Abre pool mysql2, instancia drizzle-orm/mysql2 sobre o schema par_*,
// opcionalmente aplica migrations (idempotente via journal próprio), e devolve
// um PartnersMysqlHandle { db, schema, close }. Nenhum throw cruza a borda.
// ADR-0020 (MySQL único). ADR-0014 (par_* isolado, migrationsTable próprio).

import { createPool, type Pool, type PoolOptions } from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import {
  buildPoolOptions as buildSharedPoolOptions,
  type PoolConfigError,
} from '#src/shared/persistence/mysql-pool-config.ts';
import * as schema from '../schemas/mysql.ts';

export type PartnersMysqlConnectOptions = Readonly<{
  connectionString: string;
  applyMigrations?: boolean;
  poolLimit?: number;
  idleTimeoutMs?: number;
  // Override do teto de conexões ociosas mantidas. Default derivado (< connectionLimit).
  maxIdle?: number;
}>;

export type PartnersMysqlHandle = Readonly<{
  db: MySql2Database<typeof schema>;
  schema: typeof schema;
  close: () => Promise<void>;
}>;

export type PartnersMysqlDriverError =
  | 'partners-mysql-driver-connection-string-invalid'
  | 'partners-mysql-driver-connect-failed'
  | 'partners-mysql-driver-migrate-failed'
  | 'partners-mysql-driver-pool-config-invalid';

const CONNECTION_STRING_RE = /^mysql:\/\/[^/@\s]+(?::[^/@\s]*)?@[^/\s]+\/[^/?\s]+/;

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_FOLDER = resolve(HERE, '..', 'migrations', 'mysql');

// Delega ao builder compartilhado (src/shared/persistence/mysql-pool-config.ts), que garante
// `maxIdle < connectionLimit` por construção — sem isso o `idleTimeout` é inerte (Incident-0001).
export const buildPartnersPoolOptions = (
  opts: PartnersMysqlConnectOptions,
): Result<PoolOptions, PoolConfigError> =>
  buildSharedPoolOptions({
    connectionString: opts.connectionString,
    ...(opts.poolLimit !== undefined ? { connectionLimit: opts.poolLimit } : {}),
    ...(opts.idleTimeoutMs !== undefined ? { idleTimeoutMs: opts.idleTimeoutMs } : {}),
    ...(opts.maxIdle !== undefined ? { maxIdle: opts.maxIdle } : {}),
  });

const validateConnectionString = (s: string): Result<true, PartnersMysqlDriverError> =>
  CONNECTION_STRING_RE.test(s) ? ok(true) : err('partners-mysql-driver-connection-string-invalid');

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const smokeCheck = async (pool: Pool): Promise<Result<true, PartnersMysqlDriverError>> => {
  try {
    await pool.query('SELECT 1');
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[partners-mysql-driver:smoke] ${String(cause)}\n`);
    return err('partners-mysql-driver-connect-failed');
  }
};

const applyMigrationsTo = async (
  db: MySql2Database<typeof schema>, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Promise<Result<true, PartnersMysqlDriverError>> => {
  try {
    // migrationsTable por módulo (ADR-0014): par_*, auth_*, ctr_* compartilham o DB `core`;
    // journal próprio evita que o migrator de um módulo pule as migrations do outro.
    await migrate(db, {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsTable: '__drizzle_migrations_partners',
    });
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[partners-mysql-driver:migrate] ${String(cause)}\n`);
    return err('partners-mysql-driver-migrate-failed');
  }
};

const createPoolSafe = (
  opts: PartnersMysqlConnectOptions,
): Result<Pool, PartnersMysqlDriverError> => {
  const cfg = buildPartnersPoolOptions(opts);
  if (!cfg.ok) {
    process.stderr.write(`[partners-mysql-driver:pool-config] ${cfg.error}\n`);
    return err('partners-mysql-driver-pool-config-invalid');
  }
  try {
    return ok(createPool(cfg.value));
  } catch (cause) {
    process.stderr.write(`[partners-mysql-driver:createPool] ${String(cause)}\n`);
    return err('partners-mysql-driver-connect-failed');
  }
};

// Handle sobre um pool EXTERNO (PoolRegistry) — NÃO é dono do pool: `close` é no-op (o registry
// faz o `end`). Usado pelo worker-runner p/ compartilhar 1 pool entre workers do mesmo RDS (#407).
export const openPartnersMysqlOnPool = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  pool: Pool,
): PartnersMysqlHandle => ({
  db: drizzle(pool, { schema, mode: 'default' }),
  schema,
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  close: () => Promise.resolve(),
});

export const openPartnersMysql = async (
  opts: PartnersMysqlConnectOptions,
): Promise<Result<PartnersMysqlHandle, PartnersMysqlDriverError>> => {
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
