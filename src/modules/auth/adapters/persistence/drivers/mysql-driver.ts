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
import * as schema from '../schemas/mysql.ts';

export type AuthMysqlConnectOptions = Readonly<{
  connectionString: string;
  // prod-safe default. Omitido = false (NAO aplica). Dev/CI passam true.
  applyMigrations?: boolean;
  poolLimit?: number;
  // Override do idleTimeout (ms). Default = DEFAULT_IDLE_TIMEOUT_MS.
  idleTimeoutMs?: number;
}>;

export type AuthMysqlHandle = Readonly<{
  db: MySql2Database<typeof schema>;
  schema: typeof schema;
  close: () => Promise<void>;
}>;

export type AuthMysqlDriverError =
  | 'auth-mysql-driver-connection-string-invalid'
  | 'auth-mysql-driver-connect-failed'
  | 'auth-mysql-driver-migrate-failed';

const CONNECTION_STRING_RE = /^mysql:\/\/[^/@\s]+(?::[^/@\s]*)?@[^/\s]+\/[^/?\s]+/;

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_FOLDER = resolve(HERE, '..', 'migrations', 'mysql');

const DEFAULT_POOL_LIMIT = 10;
// H3 — idleTimeout alinhado com wait_timeout MySQL (best-practice 03).
// (wait_timeout=300s - 30s) * 90% ≈ 243s → arredondado para 270_000 ms.
const DEFAULT_IDLE_TIMEOUT_MS = 270_000;

export const buildAuthPoolOptions = (opts: AuthMysqlConnectOptions): PoolOptions => ({
  uri: opts.connectionString,
  connectionLimit: opts.poolLimit ?? DEFAULT_POOL_LIMIT,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  // H3 — fechar conexao ociosa ANTES do servidor matar.
  idleTimeout: opts.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
  // M2 — UTC fixo no round-trip Date<->DATETIME(3).
  timezone: 'Z',
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
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[auth-mysql-driver:migrate] ${String(cause)}\n`);
    return err('auth-mysql-driver-migrate-failed');
  }
};

const createPoolSafe = (opts: AuthMysqlConnectOptions): Result<Pool, AuthMysqlDriverError> => {
  try {
    return ok(createPool(buildAuthPoolOptions(opts)));
  } catch (cause) {
    process.stderr.write(`[auth-mysql-driver:createPool] ${String(cause)}\n`);
    return err('auth-mysql-driver-connect-failed');
  }
};

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
