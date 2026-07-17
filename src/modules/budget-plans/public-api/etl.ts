/**
 * Public-API de provisionamento ETL do modulo budget-plans (BGP-ETL-WRITE-PORT).
 *
 * Unico ponto pelo qual a ETL (orquestrador da fatia 3, fora de src/) persiste as 6 entidades
 * bgp_*, SEM tocar os internos de dominio/aplicacao (ADR-0006 — cross-modulo so via public-api/;
 * espelha buildPartnersEtlPort/buildFinancialEtlPort). Idempotente por legacy_id (skip, nunca
 * UPDATE). Monta os stores a partir de uma connection-string, sem subir Fastify. ASCII puro.
 *
 * Boot-scoped: abre o pool UMA vez (via openBudgetPlansMysql) e devolve close(). Nunca abre pool
 * por operacao — causa estrutural do Incident-0001 (prod RDS connection exhaustion).
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  openBudgetPlansMysql,
  type BudgetPlansMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlansEtlStores } from '../adapters/persistence/repos/budget-plans-etl-store.drizzle.ts';
import type {
  LegacyEntityStore,
  BudgetPlanEtlInput,
  CostCenterEtlInput,
  CategoryEtlInput,
  SubcategoryEtlInput,
  BudgetEtlInput,
  BudgetResultEtlInput,
} from '../application/ports/legacy-entity-store.ts';

export type {
  LegacyEntityStore,
  BudgetPlansEtlStoreError,
  ProvisionOutcome,
  BudgetPlanEtlInput,
  CostCenterEtlInput,
  CategoryEtlInput,
  SubcategoryEtlInput,
  BudgetEtlInput,
  BudgetResultEtlInput,
} from '../application/ports/legacy-entity-store.ts';

// Ref de cada store = id UUID (string) da linha migrada. Ordem de escrita FK-segura (respeitada
// pelo caller da fatia 3): plano -> cost center -> categoria -> subcategoria -> budget -> lancamento.
export type BudgetPlansEtlPort = Readonly<{
  plans: LegacyEntityStore<BudgetPlanEtlInput, string>;
  costCenters: LegacyEntityStore<CostCenterEtlInput, string>;
  categories: LegacyEntityStore<CategoryEtlInput, string>;
  subcategories: LegacyEntityStore<SubcategoryEtlInput, string>;
  budgets: LegacyEntityStore<BudgetEtlInput, string>;
  budgetResults: LegacyEntityStore<BudgetResultEtlInput, string>;
  close: () => Promise<void>;
}>;

export type BuildBudgetPlansEtlPortOptions = Readonly<{ connectionString: string }>;

export type BuildBudgetPlansEtlPortError = BudgetPlansMysqlDriverError;

export const buildBudgetPlansEtlPort = async (
  opts: BuildBudgetPlansEtlPortOptions,
): Promise<Result<BudgetPlansEtlPort, BuildBudgetPlansEtlPortError>> => {
  // ETL one-shot: aplica migrations (idempotente). legacy_id + UNIQUE ja existem nas bgp_* (fatia 1).
  const handleR = await openBudgetPlansMysql({
    connectionString: opts.connectionString,
    applyMigrations: true,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const stores = createDrizzleBudgetPlansEtlStores(handle);

  return ok({
    ...stores,
    close: async () => handle.close(),
  });
};
