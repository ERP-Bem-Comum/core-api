/**
 * Public-API de LEITURA do orçado (BGP-READ-PORT — fatia 1/3 de REPORTS-REALIZED-VS-PLANNED).
 *
 * Único ponto pelo qual outro módulo (`reports`, no Realizado × Planejado) lê a árvore do plano e
 * os valores planejados por `(subcategoria, mês)`, SEM tocar `bgp_*` cru nem os internos de
 * persistência (ADR-0006/ADR-0014). Open Host Service do papel que o ADR-0051 dá ao budget-plans.
 * Devolve PLAIN ROWS — nunca agregados de domínio (por isso este arquivo não importa `../domain/`).
 *
 * BOOT-SCOPED: abre o pool UMA vez e devolve `close()`. Nunca por requisição — causa estrutural do
 * `handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`. Espelha
 * `buildProgramsReadPort`/`buildPartnersReadPort`. Read-only (zero escrita, sem migrations).
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  openBudgetPlansMysql,
  type BudgetPlansMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzlePlannedAmountsReader } from '../adapters/persistence/repos/planned-amounts-read.drizzle.ts';
import type { PlannedAmountsReadPort } from '../application/ports/planned-amounts-read.ts';

export type {
  PlannedAmountsReadPort,
  PlannedAmountsFilter,
  PlannedAmountRow,
  BudgetPlansReadError,
} from '../application/ports/planned-amounts-read.ts';

export type BudgetPlansReadPort = PlannedAmountsReadPort &
  Readonly<{
    close: () => Promise<void>;
  }>;

export type BuildBudgetPlansReadPortOptions = Readonly<{ connectionString: string }>;

export type BuildBudgetPlansReadPortError = BudgetPlansMysqlDriverError;

export const buildBudgetPlansReadPort = async (
  opts: BuildBudgetPlansReadPortOptions,
): Promise<Result<BudgetPlansReadPort, BuildBudgetPlansReadPortError>> => {
  // Leitura pura: as bgp_* já existem (provisionadas pelo próprio módulo / ETL). Sem applyMigrations.
  const handleR = await openBudgetPlansMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const reader = createDrizzlePlannedAmountsReader(handle);

  return ok({
    ...reader,
    close: async () => handle.close(),
  });
};
