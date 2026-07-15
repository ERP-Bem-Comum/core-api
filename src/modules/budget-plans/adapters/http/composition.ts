/**
 * Composition root do módulo budget-plans para a borda HTTP (ADR-0006/0025/0027, issue #315).
 *
 * Monta os adapters por driver e instancia os use cases. `BudgetPlansHttpDeps` expõe os use
 * cases prontos — o plugin só os invoca. Espelha `programs/adapters/http/composition.ts`.
 */

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { buildProgramsReadPort } from '#src/modules/programs/public-api/read.ts';
import { buildPartnersReadPort } from '#src/modules/partners/public-api/read.ts';
import { openRealizedByPlanReader } from '#src/modules/financial/public-api/index.ts';

import { InMemoryBudgetPlanRepository } from '../persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryCostStructureRepository } from '../persistence/repos/cost-structure-repository.in-memory.ts';
import { InMemoryProgramCatalog } from '../catalog/program-catalog.in-memory.ts';
import { InMemoryPartnerNetwork } from '../network/partner-network.in-memory.ts';
import { ProgramCatalogFromPrograms } from '../catalog/program-catalog.from-programs.ts';
import { PartnerNetworkFromPartners } from '../network/partner-network.from-partners.ts';
import { RealizedByPlanReadFromFinancial } from '../persistence/realized-by-plan-reader.financial.ts';
import { InMemoryRealizedByPlanReader } from '../persistence/realized-by-plan-reader.in-memory.ts';
import { openBudgetPlansMysql } from '../persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '../persistence/repos/budget-plan-repository.drizzle.ts';
import { createDrizzleCostStructureRepository } from '../persistence/repos/cost-structure-repository.drizzle.ts';
import { InMemoryBudgetResultRepository } from '../persistence/repos/budget-result-repository.in-memory.ts';
import { InMemoryBudgetExistsReader } from '../persistence/repos/budget-exists-reader.in-memory.ts';
import { InMemorySubcategoryLaunchTypeReader } from '../persistence/repos/subcategory-launch-type-reader.in-memory.ts';
import { createDrizzleBudgetResultRepository } from '../persistence/repos/budget-result-repository.drizzle.ts';
import { createDrizzleBudgetExistsReader } from '../persistence/repos/budget-exists-reader.drizzle.ts';
import { createDrizzleSubcategoryLaunchTypeReader } from '../persistence/repos/subcategory-launch-type-reader.drizzle.ts';

import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import { ProgramRef } from '../../domain/shared/refs.ts';
import * as PlanVersion from '../../domain/budget-plan/version.ts';
import type { BudgetPlan as BudgetPlanEntity } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanStatus } from '../../domain/budget-plan/status.ts';
import type { BudgetPlanRepository } from '../../domain/budget-plan/repository.ts';
import type { CostStructureRepository } from '../../domain/cost-structure/repository.ts';
import type { BudgetResultRepository } from '../../domain/budget-result/repository.ts';
import type { LaunchType } from '../../domain/cost-structure/launch-type.ts';
import type {
  ProgramCatalogPort,
  ProgramSnapshot,
} from '../../application/ports/program-catalog.ts';
import type { PartnerNetworkPort } from '../../application/ports/partner-network.ts';
import type { SubcategoryLaunchTypeReader } from '../../application/ports/subcategory-launch-type-reader.ts';
import type { BudgetExistsReader } from '../../application/ports/budget-exists-reader.ts';
import type { RealizedByPlanReader } from '../../application/ports/realized-by-plan-reader.ts';
import { createBudgetPlan } from '../../application/use-cases/create-budget-plan.ts';
import { listBudgetPlans } from '../../application/use-cases/list-budget-plans.ts';
import { getBudgetPlan } from '../../application/use-cases/get-budget-plan.ts';
import { listScenarioChildren } from '../../application/use-cases/list-scenario-children.ts';
import { getBudgetPlanOptions } from '../../application/use-cases/get-budget-plan-options.ts';
import { getCostStructure } from '../../application/use-cases/get-cost-structure.ts';
import { addCostCenter } from '../../application/use-cases/add-cost-center.ts';
import { addCategory } from '../../application/use-cases/add-category.ts';
import { addSubcategory } from '../../application/use-cases/add-subcategory.ts';
import { addBudgetResult } from '../../application/use-cases/add-budget-result.ts';
import { getBudgetResults } from '../../application/use-cases/get-budget-results.ts';
import { addBudget } from '../../application/use-cases/add-budget.ts';
import { deleteBudget } from '../../application/use-cases/delete-budget.ts';
import { startCalibration } from '../../application/use-cases/start-calibration.ts';
import { createScenery } from '../../application/use-cases/create-scenery.ts';
import { approveBudgetPlan } from '../../application/use-cases/approve-budget-plan.ts';
import { getBudgetPlanInsights } from '../../application/use-cases/get-budget-plan-insights.ts';
import { getConsolidatedResult } from '../../application/use-cases/get-consolidated-result.ts';
import { getPlanExport } from '../../application/use-cases/get-plan-export.ts';
import { getConsolidatedExport } from '../../application/use-cases/get-consolidated-export.ts';

export type BudgetPlansSeed = Readonly<{
  programs?: readonly ProgramSnapshot[];
  partnerStates?: readonly Readonly<{ ref: string; name: string; uf: string }>[];
  partnerMunicipalities?: readonly Readonly<{ ref: string; name: string; uf: string }>[];
  // Planos pré-existentes (dev/testes). Habilita cenários que o agregado não produz —
  // ex.: plano APROVADO p/ exercitar o bloqueio de escrita da árvore (CA3) na borda.
  plans?: readonly Readonly<{
    id: string;
    year: number;
    programRef: string;
    status: BudgetPlanStatus;
  }>[];
  // Driver memory: alimenta os readers do lançamento (US3) — no mysql eles leem bgp_budgets/
  // bgp_subcategories reais. `budgetsExisting` = ids que o budgetReader dá como existentes;
  // `subcategoryLaunchTypes` = mapa subcategoryId -> launchType do subcategoryReader.
  budgetsExisting?: readonly string[];
  subcategoryLaunchTypes?: Readonly<Record<string, LaunchType>>;
}>;

// Timestamp fixo dos planos semeados — irrelevante para os cenários da árvore de custos.
const PLAN_SEED_AT = new Date('2026-01-01T00:00:00.000Z');

const seedPlans = async (
  planRepo: BudgetPlanRepository,
  plans: readonly Readonly<{
    id: string;
    year: number;
    programRef: string;
    status: BudgetPlanStatus;
  }>[],
): Promise<void> => {
  for (const p of plans) {
    const id = BudgetPlanId.rehydrate(p.id);
    if (!id.ok) throw new Error(`budget-plans-composition: seed plan id inválido (${p.id})`);
    const programRef = ProgramRef.rehydrate(p.programRef);
    if (!programRef.ok) {
      throw new Error(`budget-plans-composition: seed programRef inválido (${p.programRef})`);
    }
    const plan: BudgetPlanEntity = {
      id: id.value,
      year: p.year,
      programRef: programRef.value,
      version: PlanVersion.initial(),
      status: p.status,
      budgets: [],
      parentId: null,
      scenarioName: null,
      createdAt: PLAN_SEED_AT,
      updatedAt: PLAN_SEED_AT,
      updatedByRef: null,
    };
    const saved = await planRepo.save(plan, []);
    if (!saved.ok) {
      throw new Error(`budget-plans-composition: seed plan save falhou (${saved.error})`);
    }
  }
};

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
  listScenarioChildren: ReturnType<typeof listScenarioChildren>;
  getBudgetPlanOptions: ReturnType<typeof getBudgetPlanOptions>;
  getCostStructure: ReturnType<typeof getCostStructure>;
  addCostCenter: ReturnType<typeof addCostCenter>;
  addCategory: ReturnType<typeof addCategory>;
  addSubcategory: ReturnType<typeof addSubcategory>;
  addBudgetResult: ReturnType<typeof addBudgetResult>;
  getBudgetResults: ReturnType<typeof getBudgetResults>;
  addBudget: ReturnType<typeof addBudget>;
  deleteBudget: ReturnType<typeof deleteBudget>;
  startCalibration: ReturnType<typeof startCalibration>;
  createScenery: ReturnType<typeof createScenery>;
  approveBudgetPlan: ReturnType<typeof approveBudgetPlan>;
  getBudgetPlanInsights: ReturnType<typeof getBudgetPlanInsights>;
  getConsolidatedResult: ReturnType<typeof getConsolidatedResult>;
  getPlanExport: ReturnType<typeof getPlanExport>;
  getConsolidatedExport: ReturnType<typeof getConsolidatedExport>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  planRepo: BudgetPlanRepository;
  costStructureRepo: CostStructureRepository;
  budgetResultRepo: BudgetResultRepository;
  subcategoryReader: SubcategoryLaunchTypeReader;
  budgetReader: BudgetExistsReader;
  programCatalog: ProgramCatalogPort;
  partnerNetwork: PartnerNetworkPort;
  realizedReader: RealizedByPlanReader;
  shutdown: () => Promise<void>;
}>;

const buildMemoryPools = async (seed: BudgetPlansSeed | undefined): Promise<Pools> => {
  const { repo: planRepo } = InMemoryBudgetPlanRepository();
  await seedPlans(planRepo, seed?.plans ?? []);

  // O writer atômico da árvore lê o status por FORA da árvore — aqui derivado do planRepo
  // (espelha o `SELECT status FOR UPDATE` do adapter drizzle). Plano ausente -> null.
  const costStructureRepo = InMemoryCostStructureRepository(async (id) => {
    const found = await planRepo.findById(id);
    return found.ok && found.value !== null ? found.value.status : null;
  }).repo;

  return {
    planRepo,
    costStructureRepo,
    budgetResultRepo: InMemoryBudgetResultRepository().repo,
    subcategoryReader: InMemorySubcategoryLaunchTypeReader(seed?.subcategoryLaunchTypes ?? {}),
    budgetReader: InMemoryBudgetExistsReader(seed?.budgetsExisting ?? []),
    programCatalog: InMemoryProgramCatalog(seed?.programs ?? []),
    partnerNetwork: InMemoryPartnerNetwork({
      states: seed?.partnerStates ?? [],
      municipalities: seed?.partnerMunicipalities ?? [],
    }),
    // Sem lastro de conciliação no driver memory → Realizado 0 para todo plano (CA1 do #416).
    realizedReader: InMemoryRealizedByPlanReader(),
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

  // Reader do Realizado (conciliado) do `financial` via ACL — pool boot-scoped, fechado no shutdown
  // (incidente RDS 0001). Mesma connection string: fin_* convive com bgp_*/prg_*/par_* no mesmo
  // database (ADR-0014 — isolamento por prefixo), como os read ports de programs/partners acima.
  const realizedReaderR = await openRealizedByPlanReader({ connectionString });
  if (!realizedReaderR.ok) {
    await partnersPort.close();
    await programsPort.close();
    await handle.close();
    throw new Error(
      `budget-plans-composition: falha ao abrir reader (realized) do financial (${realizedReaderR.error})`,
    );
  }
  const financialRealizedReader = realizedReaderR.value;

  return {
    planRepo: createDrizzleBudgetPlanRepository(handle),
    costStructureRepo: createDrizzleCostStructureRepository(handle),
    budgetResultRepo: createDrizzleBudgetResultRepository(handle),
    subcategoryReader: createDrizzleSubcategoryLaunchTypeReader(handle),
    budgetReader: createDrizzleBudgetExistsReader(handle),
    programCatalog: ProgramCatalogFromPrograms(programsPort),
    partnerNetwork: PartnerNetworkFromPartners(partnersPort),
    realizedReader: RealizedByPlanReadFromFinancial(financialRealizedReader.getByPlans),
    shutdown: async () => {
      await financialRealizedReader.close();
      await partnersPort.close();
      await programsPort.close();
      await handle.close();
    },
  };
};

const makeDeps = (pools: Pools): BudgetPlansHttpDeps => {
  const clock = ClockReal();
  const { planRepo, costStructureRepo, budgetResultRepo, subcategoryReader, budgetReader } = pools;
  const { programCatalog, partnerNetwork, realizedReader } = pools;
  return {
    createBudgetPlan: createBudgetPlan({ planRepo, programCatalog, clock }),
    listBudgetPlans: listBudgetPlans({ planRepo, programCatalog }),
    getBudgetPlan: getBudgetPlan({ planRepo, programCatalog }),
    listScenarioChildren: listScenarioChildren({ planRepo }),
    getBudgetPlanOptions: getBudgetPlanOptions({ planRepo, programCatalog, partnerNetwork, clock }),
    getCostStructure: getCostStructure({ costStructureRepo, planRepo }),
    addCostCenter: addCostCenter({ costStructureRepo }),
    addCategory: addCategory({ costStructureRepo }),
    addSubcategory: addSubcategory({ costStructureRepo }),
    addBudgetResult: addBudgetResult({ budgetResultRepo, subcategoryReader, budgetReader }),
    getBudgetResults: getBudgetResults({ budgetResultRepo }),
    addBudget: addBudget({ planRepo, clock }),
    deleteBudget: deleteBudget({ planRepo, budgetResultRepo, clock }),
    startCalibration: startCalibration({ planRepo, costStructureRepo, budgetResultRepo, clock }),
    createScenery: createScenery({ planRepo, costStructureRepo, budgetResultRepo, clock }),
    approveBudgetPlan: approveBudgetPlan({ planRepo, clock }),
    getBudgetPlanInsights: getBudgetPlanInsights({ planRepo, realizedReader }),
    getConsolidatedResult: getConsolidatedResult({ planRepo, programCatalog }),
    getPlanExport: getPlanExport({
      planRepo,
      costStructureRepo,
      budgetResultRepo,
      programCatalog,
      partnerNetwork,
    }),
    getConsolidatedExport: getConsolidatedExport({
      planRepo,
      costStructureRepo,
      budgetResultRepo,
      programCatalog,
      partnerNetwork,
    }),
    shutdown: pools.shutdown,
  };
};

export const buildBudgetPlansHttpDeps = async (
  config: BudgetPlansCompositionConfig,
): Promise<BudgetPlansHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(await buildMemoryPools(config.seed));
  }
  return makeDeps(await buildMysqlPools(config.connectionString));
};
