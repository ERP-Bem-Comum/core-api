// Builder compartilhado das opções de pool `mysql2` — invariante única e testável.
//
// Origem: Incident-0001 (esgotamento de conexões RDS, 56/60). Os 7 drivers duplicavam
// `buildPoolOptions` com `idleTimeout` setado mas SEM `maxIdle` → o reaper de conexões
// ociosas do mysql2 (`_removeIdleTimeoutConnections`) só é agendado quando
// `maxIdle < connectionLimit` (`node_modules/mysql2/lib/base/pool.js:50`); com `maxIdle`
// no default (`= connectionLimit`, `lib/pool_config.js:18`) a guarda é sempre falsa e o
// `idleTimeout` fica INERTE. Aqui a invariante `maxIdle < connectionLimit` é garantida por
// construção: config inerte é IMPOSSÍVEL (default derivado) ou rejeitada com `Result` error.
//
// Lição-mãe do post-mortem: "config presente ≠ config com efeito" — ver o teste de efeito
// (CA-8) em tests/shared/persistence/mysql-pool-config.test.ts.

import type { PoolOptions } from 'mysql2/promise';

import { type Result, ok, err } from '../primitives/result.ts';

export type PoolConfigInput = Readonly<{
  connectionString: string;
  connectionLimit?: number;
  idleTimeoutMs?: number;
  maxIdle?: number;
}>;

export type PoolConfigError =
  | 'pool-config-connection-limit-invalid'
  | 'pool-config-max-idle-invalid'
  | 'pool-config-idle-timeout-inert';

const DEFAULT_CONNECTION_LIMIT = 10;
// Derivado de `(wait_timeout=300s − 30s) × 90% ≈ 243s`, arredondado ao canônico da
// best-practice jusdb/03 §"Pool–MySQL alignment" (270_000 ms). Agora EFETIVO (maxIdle o arma).
const DEFAULT_IDLE_TIMEOUT_MS = 270_000;
const KEEP_ALIVE_INITIAL_DELAY_MS = 10_000;

// `maxIdle` default: poucas conexões quentes por pool, SEMPRE < connectionLimit (reaper arma).
// Conservador dado o alto número de pools por processo hoje; revisitável no connection budget.
const defaultMaxIdle = (connectionLimit: number): number =>
  Math.max(1, Math.min(2, connectionLimit - 1));

export const buildPoolOptions = (input: PoolConfigInput): Result<PoolOptions, PoolConfigError> => {
  const connectionLimit = input.connectionLimit ?? DEFAULT_CONNECTION_LIMIT;
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
    return err('pool-config-connection-limit-invalid');
  }

  const maxIdle = input.maxIdle ?? defaultMaxIdle(connectionLimit);
  if (!Number.isInteger(maxIdle) || maxIdle < 1) {
    return err('pool-config-max-idle-invalid');
  }
  // A invariante central do Incident-0001: sem isto, `idleTimeout` nunca recicla.
  if (maxIdle >= connectionLimit) {
    return err('pool-config-idle-timeout-inert');
  }

  return ok({
    uri: input.connectionString,
    connectionLimit,
    maxIdle,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: KEEP_ALIVE_INITIAL_DELAY_MS,
    idleTimeout: input.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
    // UTC fixo no round-trip Date↔DATETIME(3); blinda contra drift de timezone (M2).
    timezone: 'Z',
  });
};
