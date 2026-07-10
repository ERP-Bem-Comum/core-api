// Registry de pools mysql2 com dedup por connection-string.
//
// Origem: Incident-0001 (causa #2) + issue #407. Como TODAS as `*_DATABASE_URL` do core-api
// apontam para o MESMO RDS/db `core`/user `core_app` (ADR-0014 — isolamento por prefixo de tabela,
// não por servidor/DB), N workers/módulos com a mesma connection-string devem compartilhar UM pool
// em vez de abrir um cada. Múltiplos pools para o mesmo destino não dão bulkhead (destino único) —
// só fragmentam o teto de `max_connections`. Cada módulo cria seu drizzle+schema SOBRE o pool
// compartilhado (ver openXMysql com pool externo).
//
// Usa `buildPoolOptions` (invariante `maxIdle < connectionLimit` — CORE-DB-POOL-CONFIG-INVARIANT):
// config inerte continua impossível. A validação de FORMATO da connection-string é do caller
// (openXMysql) — o registry assume string já validada e cuida só do ciclo de vida do pool.

import { createPool, type Pool } from 'mysql2/promise';

import { type Result, ok } from '../primitives/result.ts';
import { buildPoolOptions, type PoolConfigError } from './mysql-pool-config.ts';

export type PoolRegistryOptions = Readonly<{
  connectionLimit?: number;
  idleTimeoutMs?: number;
  maxIdle?: number;
}>;

export type PoolRegistry = Readonly<{
  // Retorna o pool da connection-string, criando na 1ª vez e reusando depois (dedup).
  getOrCreate: (connectionString: string) => Result<Pool, PoolConfigError>;
  // Fecha todos os pools registrados. Idempotente.
  closeAll: () => Promise<void>;
}>;

export const createPoolRegistry = (options: PoolRegistryOptions = {}): PoolRegistry => {
  const pools = new Map<string, Pool>();

  const getOrCreate = (connectionString: string): Result<Pool, PoolConfigError> => {
    const existing = pools.get(connectionString);
    if (existing !== undefined) return ok(existing);

    const cfg = buildPoolOptions({
      connectionString,
      ...(options.connectionLimit !== undefined
        ? { connectionLimit: options.connectionLimit }
        : {}),
      ...(options.idleTimeoutMs !== undefined ? { idleTimeoutMs: options.idleTimeoutMs } : {}),
      ...(options.maxIdle !== undefined ? { maxIdle: options.maxIdle } : {}),
    });
    if (!cfg.ok) return cfg;

    const pool = createPool(cfg.value);
    pools.set(connectionString, pool);
    return ok(pool);
  };

  const closeAll = async (): Promise<void> => {
    const all = [...pools.values()];
    pools.clear();
    // `.catch` defensivo: um pool já encerrado (ou nunca conectado) não deve abortar o drain dos demais.
    await Promise.all(
      all.map(async (pool) => {
        await pool.end().catch(() => undefined);
      }),
    );
  };

  return { getOrCreate, closeAll } as const;
};
