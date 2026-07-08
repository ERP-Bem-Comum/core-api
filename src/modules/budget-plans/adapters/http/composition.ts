/**
 * Composition root do módulo budget-plans para a borda HTTP (ADR-0006/0025/0027, issue #315).
 *
 * Monta os adapters por driver e instancia os use cases. `BudgetPlansHttpDeps` expõe os use
 * cases prontos — o plugin só os invoca. Espelha `programs/adapters/http/composition.ts`.
 */

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { buildProgramsReadPort } from '#src/modules/programs/public-api/read.ts';
import { buildPartnersReadPort } from '#src/modules/partners/public-api/read.ts';

import { InMemoryBudgetPlanRepository } from '../persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryProgramCatalog } from '../catalog/program-catalog.in-memory.ts';
import { InMemoryPartnerNetwork } from '../network/partner-network.in-memory.ts';
import { ProgramCatalogFromPrograms } from '../catalog/program-catalog.from-programs.ts';
import { PartnerNetworkFromPartners } from '../network/partner-network.from-partners.ts';
import { openBudgetPlansMysql } from '../persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '../persistence/repos/budget-plan-repository.drizzle.ts';

import type { BudgetPlanRepository } from '../../domain/budget-plan/repository.ts';
import type {
  ProgramCatalogPort,
  ProgramSnapshot,
} from '../../application/ports/program-catalog.ts';
import type { PartnerNetworkPort } from '../../application/ports/partner-network.ts';
import { createBudgetPlan } from '../../application/use-cases/create-budget-plan.ts';
import { listBudgetPlans } from '../../application/use-cases/list-budget-plans.ts';
import { getBudgetPlan } from '../../application/use-cases/get-budget-plan.ts';
import { getBudgetPlanOptions } from '../../application/use-cases/get-budget-plan-options.ts';

export type BudgetPlansSeed = Readonly<{
  programs?: readonly ProgramSnapshot[];
  partnerStates?: readonly Readonly<{ ref: string; name: string; uf: string }>[];
  partnerMunicipalities?: readonly Readonly<{ ref: string; name: string; uf: string }>[];
}>;

export type BudgetPlansCompositionConfig =
  | Readonly<{
      driver: 'memory';
      /** Seed do driver memory (testes/dev). Ausente -> catálogos/repo vazios. */
      seed?: BudgetPlansSeed;
    }>
  // Uma única connection string: bgp_* (writer) + prg_*/par_* (read ports) vivem no
  // mesmo database (ADR-0014 — isolamento por prefixo), como no composition do financial.
  | Readonly<{ driver: 'mysql'; connectionString: string }>;

export type BudgetPlansHttpDeps = Readonly<{
  createBudgetPlan: ReturnType<typeof createBudgetPlan>;
  listBudgetPlans: ReturnType<typeof listBudgetPlans>;
  getBudgetPlan: ReturnType<typeof getBudgetPlan>;
  getBudgetPlanOptions: ReturnType<typeof getBudgetPlanOptions>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  planRepo: BudgetPlanRepository;
  programCatalog: ProgramCatalogPort;
  partnerNetwork: PartnerNetworkPort;
  shutdown: () => Promise<void>;
}>;

const buildMemoryPools = (seed: BudgetPlansSeed | undefined): Pools => {
  const { repo: planRepo } = InMemoryBudgetPlanRepository();
  return {
    planRepo,
    programCatalog: InMemoryProgramCatalog(seed?.programs ?? []),
    partnerNetwork: InMemoryPartnerNetwork({
      states: seed?.partnerStates ?? [],
      municipalities: seed?.partnerMunicipalities ?? [],
    }),
    shutdown: () => Promise.resolve(),
  };
};

const buildMysqlPools = async (connectionString: string): Promise<Pools> => {
  // Boot NÃO migra (CORE-MIGRATE-BOOT-INVERT): schema vem do job `migrate`.
  const handleR = await openBudgetPlansMysql({ connectionString, applyMigrations: false });
  if (!handleR.ok) {
    throw new Error(`budget-plans-composition: falha ao abrir writer (${handleR.error})`);
  }
  const handle = handleR.value;

  const programsPortR = await buildProgramsReadPort({ connectionString });
  if (!programsPortR.ok) {
    await handle.close();
    throw new Error(
      `budget-plans-composition: falha ao abrir read port de programs (${programsPortR.error})`,
    );
  }
  const programsPort = programsPortR.value;

  const partnersPortR = await buildPartnersReadPort({ connectionString });
  if (!partnersPortR.ok) {
    await programsPort.close();
    await handle.close();
    throw new Error(
      `budget-plans-composition: falha ao abrir read port de partners (${partnersPortR.error})`,
    );
  }
  const partnersPort = partnersPortR.value;

  return {
    planRepo: createDrizzleBudgetPlanRepository(handle),
    programCatalog: ProgramCatalogFromPrograms(programsPort),
    partnerNetwork: PartnerNetworkFromPartners(partnersPort),
    shutdown: async () => {
      await partnersPort.close();
      await programsPort.close();
      await handle.close();
    },
  };
};

const makeDeps = (pools: Pools): BudgetPlansHttpDeps => {
  const clock = ClockReal();
  const { planRepo, programCatalog, partnerNetwork } = pools;
  return {
    createBudgetPlan: createBudgetPlan({ planRepo, programCatalog, clock }),
    listBudgetPlans: listBudgetPlans({ planRepo, programCatalog }),
    getBudgetPlan: getBudgetPlan({ planRepo, programCatalog }),
    getBudgetPlanOptions: getBudgetPlanOptions({ planRepo, programCatalog, partnerNetwork, clock }),
    shutdown: pools.shutdown,
  };
};

export const buildBudgetPlansHttpDeps = async (
  config: BudgetPlansCompositionConfig,
): Promise<BudgetPlansHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(buildMemoryPools(config.seed));
  }
  return makeDeps(await buildMysqlPools(config.connectionString));
};
