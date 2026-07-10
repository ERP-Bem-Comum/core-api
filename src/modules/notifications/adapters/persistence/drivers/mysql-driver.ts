// Driver runtime MySQL para o módulo notifications — espelha partners/auth/contracts.
//
// Abre pool mysql2, instancia drizzle-orm/mysql2 sobre o schema notifications_*,
// opcionalmente aplica migrations (journal próprio — ADR-0014), e devolve um
// NotificationsMysqlHandle { db, schema, close }. Nenhum throw cruza a borda.
// ADR-0020 (MySQL único). ADR-0014 (notifications_* isolado, migrationsTable próprio).

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

export type NotificationsMysqlConnectOptions = Readonly<{
  connectionString: string;
  applyMigrations?: boolean;
  poolLimit?: number;
  idleTimeoutMs?: number;
  // Override do teto de conexões ociosas mantidas. Default derivado (< connectionLimit).
  maxIdle?: number;
}>;

export type NotificationsMysqlHandle = Readonly<{
  db: MySql2Database<typeof schema>;
  schema: typeof schema;
  close: () => Promise<void>;
}>;

export type NotificationsMysqlDriverError =
  | 'notifications-mysql-driver-connection-string-invalid'
  | 'notifications-mysql-driver-connect-failed'
  | 'notifications-mysql-driver-migrate-failed'
  | 'notifications-mysql-driver-pool-config-invalid';

const CONNECTION_STRING_RE = /^mysql:\/\/[^/@\s]+(?::[^/@\s]*)?@[^/\s]+\/[^/?\s]+/;

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_FOLDER = resolve(HERE, '..', 'migrations', 'mysql');

// Delega ao builder compartilhado (src/shared/persistence/mysql-pool-config.ts), que garante
// `maxIdle < connectionLimit` por construção — sem isso o `idleTimeout` é inerte (Incident-0001).
export const buildNotificationsPoolOptions = (
  opts: NotificationsMysqlConnectOptions,
): Result<PoolOptions, PoolConfigError> =>
  buildSharedPoolOptions({
    connectionString: opts.connectionString,
    ...(opts.poolLimit !== undefined ? { connectionLimit: opts.poolLimit } : {}),
    ...(opts.idleTimeoutMs !== undefined ? { idleTimeoutMs: opts.idleTimeoutMs } : {}),
    ...(opts.maxIdle !== undefined ? { maxIdle: opts.maxIdle } : {}),
  });

const validateConnectionString = (s: string): Result<true, NotificationsMysqlDriverError> =>
  CONNECTION_STRING_RE.test(s)
    ? ok(true)
    : err('notifications-mysql-driver-connection-string-invalid');

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const smokeCheck = async (pool: Pool): Promise<Result<true, NotificationsMysqlDriverError>> => {
  try {
    await pool.query('SELECT 1');
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[notifications-mysql-driver:smoke] ${String(cause)}\n`);
    return err('notifications-mysql-driver-connect-failed');
  }
};

const applyMigrationsTo = async (
  db: MySql2Database<typeof schema>, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Promise<Result<true, NotificationsMysqlDriverError>> => {
  try {
    // migrationsTable por módulo (ADR-0014): notifications_*, par_*, ctr_* compartilham
    // o DB `core`; journal próprio evita pular migrations de outro módulo.
    await migrate(db, {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsTable: '__drizzle_migrations_notifications',
    });
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[notifications-mysql-driver:migrate] ${String(cause)}\n`);
    return err('notifications-mysql-driver-migrate-failed');
  }
};

const createPoolSafe = (
  opts: NotificationsMysqlConnectOptions,
): Result<Pool, NotificationsMysqlDriverError> => {
  const cfg = buildNotificationsPoolOptions(opts);
  if (!cfg.ok) {
    process.stderr.write(`[notifications-mysql-driver:pool-config] ${cfg.error}\n`);
    return err('notifications-mysql-driver-pool-config-invalid');
  }
  try {
    return ok(createPool(cfg.value));
  } catch (cause) {
    process.stderr.write(`[notifications-mysql-driver:createPool] ${String(cause)}\n`);
    return err('notifications-mysql-driver-connect-failed');
  }
};

export const openNotificationsMysql = async (
  opts: NotificationsMysqlConnectOptions,
): Promise<Result<NotificationsMysqlHandle, NotificationsMysqlDriverError>> => {
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
