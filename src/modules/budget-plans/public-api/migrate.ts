/**
 * Porta pública de migração do módulo budget-plans (CORE-MIGRATE-JOB / ADR-0006).
 *
 * Único ponto pelo qual o job `migrate` (src/jobs/migrate) aplica o schema deste
 * módulo, sem tocar adapters internos. Idempotente via journal do drizzle-kit
 * (migrationsTable própria por módulo). Abre o pool só para migrar e fecha em seguida.
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  openBudgetPlansMysql,
  type BudgetPlansMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';

export type ApplyBudgetPlansMigrationsError = BudgetPlansMysqlDriverError;

export const applyMigrations = async (
  connectionString: string,
): Promise<Result<true, ApplyBudgetPlansMigrationsError>> => {
  const handleR = await openBudgetPlansMysql({ connectionString, applyMigrations: true });
  if (!handleR.ok) return err(handleR.error);
  await handleR.value.close();
  return ok(true);
};
