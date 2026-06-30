/**
 * Porta pública de migração do módulo contracts (CORE-MIGRATE-JOB / ADR-0006).
 *
 * Único ponto pelo qual o job `migrate` (src/jobs/migrate) aplica o schema deste
 * módulo, sem tocar adapters internos. Idempotente via journal do drizzle-kit
 * (migrationsTable própria por módulo). Abre o pool só para migrar e fecha em seguida.
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { openMysql, type MysqlDriverError } from '../adapters/persistence/drivers/mysql-driver.ts';

export type ApplyContractsMigrationsError = MysqlDriverError;

export const applyMigrations = async (
  connectionString: string,
): Promise<Result<true, ApplyContractsMigrationsError>> => {
  const handleR = await openMysql({ connectionString, applyMigrations: true });
  if (!handleR.ok) return err(handleR.error);
  await handleR.value.close();
  return ok(true);
};
