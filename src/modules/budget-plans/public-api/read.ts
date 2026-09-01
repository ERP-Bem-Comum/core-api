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
  buildProgramsReadPort,
  type BuildProgramsReadPortError,
} from '../../programs/public-api/read.ts';
import {
  openBudgetPlansMysql,
  type BudgetPlansMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzlePlannedAmountsReader } from '../adapters/persistence/repos/planned-amounts-read.drizzle.ts';
import { createDrizzlePlanLabelsReader } from '../adapters/persistence/repos/plan-labels-read.drizzle.ts';
import { createDrizzleTaxonomyPathReader } from '../adapters/persistence/repos/taxonomy-path-read.drizzle.ts';
import { ProgramCatalogFromPrograms } from '../adapters/catalog/program-catalog.from-programs.ts';
import type { PlannedAmountsReadPort } from '../application/ports/planned-amounts-read.ts';
import type { PlanLabelsReadPort } from '../application/ports/plan-labels-read.ts';
import type { TaxonomyPathReadPort } from '../application/ports/taxonomy-path-read.ts';

export type {
  PlannedAmountsReadPort,
  PlannedAmountsFilter,
  PlannedAmountRow,
  BudgetPlansReadError,
} from '../application/ports/planned-amounts-read.ts';
export type { PlanLabelsReadPort } from '../application/ports/plan-labels-read.ts';
// M2 (RN-M2-09/10): o `financial` valida o caminho da taxonomia por aqui, sem conhecer `bgp_*`.
export type {
  TaxonomyPathReadPort,
  TaxonomyPathRow,
} from '../application/ports/taxonomy-path-read.ts';

export type BudgetPlansReadPort = PlannedAmountsReadPort &
  PlanLabelsReadPort &
  TaxonomyPathReadPort &
  Readonly<{
    close: () => Promise<void>;
  }>;

export type BuildBudgetPlansReadPortOptions = Readonly<{ connectionString: string }>;

// O rótulo do plano (resolvePlanLabels) resolve o nome do programa via `programs/public-api` —
// mesmo database (ADR-0014, prefixo). Por isso o boot pode falhar por qualquer um dos dois drivers.
export type BuildBudgetPlansReadPortError =
  | BudgetPlansMysqlDriverError
  | BuildProgramsReadPortError;

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

  // Catálogo de programas (ACL) — pool boot-scoped próprio, para compor o rótulo do plano. Mesmo
  // database (prg_* convive com bgp_*, ADR-0014). Fechado junto com o handle no `close()`.
  const programsPortR = await buildProgramsReadPort({ connectionString: opts.connectionString });
  if (!programsPortR.ok) {
    await handle.close();
    return err(programsPortR.error);
  }
  const programsPort = programsPortR.value;
  const programCatalog = ProgramCatalogFromPrograms(programsPort);

  const reader = createDrizzlePlannedAmountsReader(handle);
  const labelsReader = createDrizzlePlanLabelsReader(handle, programCatalog);
  const taxonomyReader = createDrizzleTaxonomyPathReader(handle);

  return ok({
    ...reader,
    ...labelsReader,
    ...taxonomyReader,
    close: async () => {
      await programsPort.close();
      await handle.close();
    },
  });
};
