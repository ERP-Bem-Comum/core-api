// Driver runtime MySQL para o modulo auth — espelha contracts/adapters/persistence/drivers/mysql-driver.ts.
//
// Responsabilidade: abrir pool mysql2, instanciar drizzle-orm/mysql2 sobre o schema auth_*,
// opcionalmente aplicar migrations (idempotente via journal do drizzle-kit), e devolver
// um AuthMysqlHandle com { db, schema, close }.
//
// Boundary: toda excecao do mysql2 ou migrator e capturada e convertida em Result.
// Nenhum throw cruza a borda. ADR-0020 (MySQL unico dialeto). ADR-0014 (auth_* isolado).
//
// Tuning: mesmo padrao de pool do contracts (idleTimeout 270s, timezone 'Z').

import { createPool, type Pool, type PoolOptions } from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import {
  buildPoolOptions as buildSharedPoolOptions,
  type PoolConfigError,
} from '../../../../../shared/persistence/mysql-pool-config.ts';
import * as schema from '../schemas/mysql.ts';

export type AuthMysqlConnectOptions = Readonly<{
  connectionString: string;
  // prod-safe default. Omitido = false (NAO aplica). Dev/CI passam true.
  applyMigrations?: boolean;
  poolLimit?: number;
  // Override do idleTimeout (ms). Default no builder compartilhado.
  idleTimeoutMs?: number;
  // Override do teto de conexões ociosas mantidas. Default derivado (< connectionLimit).
  maxIdle?: number;
}>;

export type AuthMysqlHandle = Readonly<{
  db: MySql2Database<typeof schema>;
  schema: typeof schema;
  close: () => Promise<void>;
}>;

export type AuthMysqlDriverError =
  | 'auth-mysql-driver-connection-string-invalid'
  | 'auth-mysql-driver-connect-failed'
  | 'auth-mysql-driver-migrate-failed'
  | 'auth-mysql-driver-pool-config-invalid';

const CONNECTION_STRING_RE = /^mysql:\/\/[^/@\s]+(?::[^/@\s]*)?@[^/\s]+\/[^/?\s]+/;

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_FOLDER = resolve(HERE, '..', 'migrations', 'mysql');

// Delega ao builder compartilhado (src/shared/persistence/mysql-pool-config.ts), que garante
// `maxIdle < connectionLimit` por construção — sem isso o `idleTimeout` é inerte (Incident-0001).
export const buildAuthPoolOptions = (
  opts: AuthMysqlConnectOptions,
): Result<PoolOptions, PoolConfigError> =>
  buildSharedPoolOptions({
    connectionString: opts.connectionString,
    ...(opts.poolLimit !== undefined ? { connectionLimit: opts.poolLimit } : {}),
    ...(opts.idleTimeoutMs !== undefined ? { idleTimeoutMs: opts.idleTimeoutMs } : {}),
    ...(opts.maxIdle !== undefined ? { maxIdle: opts.maxIdle } : {}),
  });

const validateConnectionString = (s: string): Result<true, AuthMysqlDriverError> => {
  if (!CONNECTION_STRING_RE.test(s)) return err('auth-mysql-driver-connection-string-invalid');
  return ok(true);
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const smokeCheck = async (pool: Pool): Promise<Result<true, AuthMysqlDriverError>> => {
  try {
    await pool.query('SELECT 1');
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[auth-mysql-driver:smoke] ${String(cause)}\n`);
    return err('auth-mysql-driver-connect-failed');
  }
};

const applyMigrationsTo = async (
  db: MySql2Database<typeof schema>, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Promise<Result<true, AuthMysqlDriverError>> => {
  try {
    // `migrationsTable` por módulo (ADR-0014 isolamento): auth e contracts compartilham o DB `core`;
    // journal próprio evita que o migrator de um módulo pule as migrations do outro (timestamp shared).
    await migrate(db, {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsTable: '__drizzle_migrations_auth',
    });
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[auth-mysql-driver:migrate] ${String(cause)}\n`);
    return err('auth-mysql-driver-migrate-failed');
  }
};

const createPoolSafe = (opts: AuthMysqlConnectOptions): Result<Pool, AuthMysqlDriverError> => {
  const cfg = buildAuthPoolOptions(opts);
  if (!cfg.ok) {
    process.stderr.write(`[auth-mysql-driver:pool-config] ${cfg.error}\n`);
    return err('auth-mysql-driver-pool-config-invalid');
  }
  try {
    return ok(createPool(cfg.value));
  } catch (cause) {
    process.stderr.write(`[auth-mysql-driver:createPool] ${String(cause)}\n`);
    return err('auth-mysql-driver-connect-failed');
  }
};

// Handle sobre um pool EXTERNO (PoolRegistry) — NÃO é dono do pool: `close` é no-op (o registry
// faz o `end`). Usado pelo worker-runner p/ compartilhar 1 pool entre workers do mesmo RDS (#407).
export const openAuthMysqlOnPool = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  pool: Pool,
): AuthMysqlHandle => ({
  db: drizzle(pool, { schema, mode: 'default' }),
  schema,
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  close: () => Promise.resolve(),
});

export const openAuthMysql = async (
  opts: AuthMysqlConnectOptions,
): Promise<Result<AuthMysqlHandle, AuthMysqlDriverError>> => {
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

  // prod-safe: so migra se caller pediu EXPLICITAMENTE true.
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
