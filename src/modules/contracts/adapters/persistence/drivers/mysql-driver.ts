// Driver runtime MySQL — wirado em CTR-DB-DRIVER-MYSQL (#4 da sequência ADR-0020).
//
// Responsabilidade: abrir um pool `mysql2/promise`, instanciar `drizzle-orm/mysql2`,
// opcionalmente aplicar as migrations (idempotente via journal do drizzle-kit),
// e devolver um `MysqlHandle` que dá ao caller acesso a `db`, `schema` e `close`.
//
// Boundary: toda exceção do `mysql2` ou do migrator é capturada e convertida
// em `Result<MysqlHandle, MysqlDriverError>`. Nenhum `throw` cruza a borda.
//
// Tuning (CTR-DB-DRIVER-POOL-TUNING — audit `handbook/reviews/0002` §H3/§M2/§M5):
//   - `timezone: 'Z'`            blinda Date↔DATETIME(3) contra drift de TZ (M2).
//   - `idleTimeout: 270_000` ms  alinhamento pool↔servidor (best-practice 03, H3).
//   - `applyMigrations` default `false`  prod-safe por default; CLI/CI passam `true`
//                                explícito (M5 — sem race em deploy multi-instância).

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

export type MysqlConnectOptions = Readonly<{
  connectionString: string;
  // M5 — prod-safe default. Omitido = `false` (NÃO aplica). Dev/CI passam `true`.
  applyMigrations?: boolean;
  poolLimit?: number;
  // H3 — override do `idleTimeout` (ms). Default no builder compartilhado.
  idleTimeoutMs?: number;
  // Override do teto de conexões ociosas mantidas. Default derivado (< connectionLimit).
  maxIdle?: number;
}>;

export type MysqlHandle = Readonly<{
  db: MySql2Database<typeof schema>;
  schema: typeof schema;
  close: () => Promise<void>;
}>;

export type MysqlDriverError =
  | 'mysql-driver-connection-string-invalid'
  | 'mysql-driver-connect-failed'
  | 'mysql-driver-migrate-failed'
  | 'mysql-driver-pool-config-invalid';

// Validação leve da connection string. `mysql2` aceita a URI nativamente, então
// só rejeitamos formatos manifestamente errados — o driver real cuida do resto.
const CONNECTION_STRING_RE = /^mysql:\/\/[^/@\s]+(?::[^/@\s]*)?@[^/\s]+\/[^/?\s]+/;

// Caminho da pasta de migrations relativo à raiz do projeto. Resolvido a
// partir deste arquivo (`src/modules/contracts/adapters/persistence/drivers/`)
// → subir 5 níveis → `src/` → e descer para `migrations/mysql/`.
const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_FOLDER = resolve(HERE, '..', 'migrations', 'mysql');

// Delega ao builder compartilhado (src/shared/persistence/mysql-pool-config.ts), que garante
// `maxIdle < connectionLimit` por construção — sem isso o `idleTimeout` é inerte (Incident-0001).
export const buildPoolOptions = (opts: MysqlConnectOptions): Result<PoolOptions, PoolConfigError> =>
  buildSharedPoolOptions({
    connectionString: opts.connectionString,
    ...(opts.poolLimit !== undefined ? { connectionLimit: opts.poolLimit } : {}),
    ...(opts.idleTimeoutMs !== undefined ? { idleTimeoutMs: opts.idleTimeoutMs } : {}),
    ...(opts.maxIdle !== undefined ? { maxIdle: opts.maxIdle } : {}),
  });

const validateConnectionString = (s: string): Result<true, MysqlDriverError> => {
  if (!CONNECTION_STRING_RE.test(s)) return err('mysql-driver-connection-string-invalid');
  return ok(true);
};

// `Pool` do mysql2 expõe interface mutável (query/end/getConnection). Usamos
// só como cliente — não mutamos o objeto em si.
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const smokeCheck = async (pool: Pool): Promise<Result<true, MysqlDriverError>> => {
  try {
    await pool.query('SELECT 1');
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[mysql-driver:smoke] ${String(cause)}\n`);
    return err('mysql-driver-connect-failed');
  }
};

// `MySql2Database` é mutável internamente (insert/update/delete são parte
// da API). Usado read-only — não mutamos o objeto em si.
const applyMigrationsTo = async (
  db: MySql2Database<typeof schema>, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Promise<Result<true, MysqlDriverError>> => {
  try {
    // `migrationsTable` por módulo (ADR-0014 isolamento): auth e contracts compartilham o DB `core`,
    // então um journal `__drizzle_migrations` compartilhado faria o migrator de um módulo pular as
    // migrations do outro por comparação de timestamp. Tabela de journal própria evita a colisão.
    await migrate(db, {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsTable: '__drizzle_migrations_contracts',
    });
    return ok(true);
  } catch (cause) {
    process.stderr.write(`[mysql-driver:migrate] ${String(cause)}\n`);
    return err('mysql-driver-migrate-failed');
  }
};

const createPoolSafe = (opts: MysqlConnectOptions): Result<Pool, MysqlDriverError> => {
  const cfg = buildPoolOptions(opts);
  if (!cfg.ok) {
    process.stderr.write(`[mysql-driver:pool-config] ${cfg.error}\n`);
    return err('mysql-driver-pool-config-invalid');
  }
  try {
    return ok(createPool(cfg.value));
  } catch (cause) {
    process.stderr.write(`[mysql-driver:createPool] ${String(cause)}\n`);
    return err('mysql-driver-connect-failed');
  }
};

export const openMysql = async (
  opts: MysqlConnectOptions,
): Promise<Result<MysqlHandle, MysqlDriverError>> => {
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

  // M5 — prod-safe: só migra se caller pediu EXPLÍCITAMENTE `true`.
  // Default (omitido / `false`) = não aplica → deploy multi-instância sem race.
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
