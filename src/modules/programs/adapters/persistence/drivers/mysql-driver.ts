// Driver runtime MySQL do módulo programs — espelha partners/contracts.
// Abre pool mysql2, instancia drizzle sobre o schema prg_*, opcionalmente aplica
// migrations (journal próprio __drizzle_migrations_programs), devolve handle. Sem throw.

import { createPool, type Pool, type PoolOptions } from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as schema from '../schemas/mysql.ts';

export type ProgramsMysqlConnectOptions = Readonly<{
  connectionString: string;
  applyMigrations?: boolean;
  poolLimit?: number;
  idleTimeoutMs?: number;
}>;

export type ProgramsMysqlHandle = Readonly<{
  db: MySql2Database<typeof schema>;
  schema: typeof schema;
  close: () => Promise<void>;
}>;

export type ProgramsMysqlDriverError =
  | 'programs-mysql-driver-connection-string-invalid'
  | 'programs-mysql-driver-connect-failed'
  | 'programs-mysql-driver-migrate-failed';

const CONNECTION_STRING_RE = /^mysql:\/\/[^/@\s]+(?::[^/@\s]*)?@[^/\s]+\/[^/?\s]+/;

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_FOLDER = resolve(HERE, '..', 'migrations', 'mysql');

const DEFAULT_POOL_LIMIT = 10;
const DEFAULT_IDLE_TIMEOUT_MS = 270_000;

export const buildProgramsPoolOptions = (opts: ProgramsMysqlConnectOptions): PoolOptions => ({
  uri: opts.connectionString,
  connectionLimit: opts.poolLimit ?? DEFAULT_POOL_LIMIT,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  idleTimeout: opts.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
  timezone: 'Z',
});

const validateConnectionString = (s: string): Result<true, ProgramsMysqlDriverError> =>
  CONNECTION_STRING_RE.test(s) ? ok(true) : err('programs-mysql-driver-connection-string-invalid');

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const smokeCheck = async (pool: Pool): Promise<Result<true, ProgramsMysqlDriverError>> => {
  try {
    await pool.query('SELECT 1');
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[programs-mysql-driver:smoke] ${String(cause)}\n`);
    return err('programs-mysql-driver-connect-failed');
  }
};

const applyMigrationsTo = async (
  db: MySql2Database<typeof schema>, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Promise<Result<true, ProgramsMysqlDriverError>> => {
  try {
    await migrate(db, {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsTable: '__drizzle_migrations_programs',
    });
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[programs-mysql-driver:migrate] ${String(cause)}\n`);
    return err('programs-mysql-driver-migrate-failed');
  }
};

const createPoolSafe = (
  opts: ProgramsMysqlConnectOptions,
): Result<Pool, ProgramsMysqlDriverError> => {
  try {
    return ok(createPool(buildProgramsPoolOptions(opts)));
  } catch (cause) {
    process.stderr.write(`[programs-mysql-driver:createPool] ${String(cause)}\n`);
    return err('programs-mysql-driver-connect-failed');
  }
};

export const openProgramsMysql = async (
  opts: ProgramsMysqlConnectOptions,
): Promise<Result<ProgramsMysqlHandle, ProgramsMysqlDriverError>> => {
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
