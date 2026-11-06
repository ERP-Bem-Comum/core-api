// Suporte dos testes de regressão dos 10 achados do /code-review da #1092.
//
// Cada teste FORÇA o cenário do achado e o repete `REGRESSION_REPEAT` vezes (default 1, para o gate
// ficar rápido; a medição roda com 1000). A asserção é a do comportamento CORRETO: ocorrências = 0.
// A linha `MEASURE {...}` vai para o stdout com a contagem, para a taxa ser lida sem parsear o TAP.

import process from 'node:process';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as CostStructureOps from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.in-memory.ts';
import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { InMemoryPlanCloneWriter } from '#src/modules/budget-plans/adapters/persistence/repos/plan-clone-writer.in-memory.ts';
import { InMemorySubcategoryLaunchTypeReader } from '#src/modules/budget-plans/adapters/persistence/repos/subcategory-launch-type-reader.in-memory.ts';
import { InMemoryBudgetExistsReader } from '#src/modules/budget-plans/adapters/persistence/repos/budget-exists-reader.in-memory.ts';
import { InMemoryProgramCatalog } from '#src/modules/budget-plans/adapters/catalog/program-catalog.in-memory.ts';
import { createDrizzleBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';
import { createDrizzleCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.drizzle.ts';
import { createDrizzleBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle.ts';
import { createDrizzlePlanCloneWriter } from '#src/modules/budget-plans/adapters/persistence/repos/plan-clone-writer.drizzle.ts';
import { createDrizzleSubcategoryLaunchTypeReader } from '#src/modules/budget-plans/adapters/persistence/repos/subcategory-launch-type-reader.drizzle.ts';
import { createDrizzleBudgetExistsReader } from '#src/modules/budget-plans/adapters/persistence/repos/budget-exists-reader.drizzle.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlanRepository } from '#src/modules/budget-plans/domain/budget-plan/repository.ts';
import type { CostStructureRepository } from '#src/modules/budget-plans/domain/cost-structure/repository.ts';
import type { BudgetResultRepository } from '#src/modules/budget-plans/domain/budget-result/repository.ts';
import type { CostStructure } from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import type { PlanCloneWriter } from '#src/modules/budget-plans/application/ports/plan-clone-writer.ts';
import type { SubcategoryLaunchTypeReader } from '#src/modules/budget-plans/application/ports/subcategory-launch-type-reader.ts';
import type { BudgetExistsReader } from '#src/modules/budget-plans/application/ports/budget-exists-reader.ts';
import { createBudgetPlan } from '#src/modules/budget-plans/application/use-cases/create-budget-plan.ts';
import { addBudget } from '#src/modules/budget-plans/application/use-cases/add-budget.ts';
import { addCostCenter } from '#src/modules/budget-plans/application/use-cases/add-cost-center.ts';
import { addCategory } from '#src/modules/budget-plans/application/use-cases/add-category.ts';
import { addSubcategory } from '#src/modules/budget-plans/application/use-cases/add-subcategory.ts';
import { addBudgetResult } from '#src/modules/budget-plans/application/use-cases/add-budget-result.ts';
import { approveBudgetPlan } from '#src/modules/budget-plans/application/use-cases/approve-budget-plan.ts';
import { startCalibration } from '#src/modules/budget-plans/application/use-cases/start-calibration.ts';
import { createScenery } from '#src/modules/budget-plans/application/use-cases/create-scenery.ts';
import { deleteAllBudgetPlans } from '#tests/support/budget-plans-reset.ts';

export const REPEAT = (() => {
  const raw = Number(process.env['REGRESSION_REPEAT'] ?? '1');
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
})();

export const mysqlEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

export const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
export const PROGRAM_PARC = '22222222-2222-4222-8222-222222222222';
export const ACTOR_REF = '00000000-0000-4000-8000-000000000001';
export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export type Repos = Readonly<{
  planRepo: BudgetPlanRepository;
  costStructureRepo: CostStructureRepository;
  budgetResultRepo: BudgetResultRepository;
  planCloneWriter: PlanCloneWriter;
  subcategoryReader: SubcategoryLaunchTypeReader;
  budgetReader: BudgetExistsReader;
}>;

// Espelha `buildMemoryPools` da composition (os readers ligados aos stores reais).
export const memoryRepos = (): Repos => {
  const budgetResultRepo = InMemoryBudgetResultRepository().repo;
  const plans = InMemoryBudgetPlanRepository(undefined, budgetResultRepo);
  const planRepo = plans.repo;
  const cost = InMemoryCostStructureRepository(async (id) => {
    const found = await planRepo.findById(id);
    return found.ok && found.value !== null ? found.value.status : null;
  });
  const costStructureRepo = cost.repo;
  return {
    planRepo,
    costStructureRepo,
    budgetResultRepo,
    planCloneWriter: InMemoryPlanCloneWriter({ planRepo, costStructureRepo, budgetResultRepo }),
    subcategoryReader: InMemorySubcategoryLaunchTypeReader({}, cost.launchTypeOf, {
      ofSubcategory: cost.planOfSubcategory,
      ofBudget: plans.planOfBudget,
    }),
    budgetReader: InMemoryBudgetExistsReader([], plans.hasBudget),
  };
};

// Espelha `buildMysqlPools` (sem os read ports de programs/partners: catálogo em memória).
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const mysqlRepos = (handle: BudgetPlansMysqlHandle): Repos => ({
  planRepo: createDrizzleBudgetPlanRepository(handle),
  costStructureRepo: createDrizzleCostStructureRepository(handle),
  budgetResultRepo: createDrizzleBudgetResultRepository(handle),
  planCloneWriter: createDrizzlePlanCloneWriter(handle),
  subcategoryReader: createDrizzleSubcategoryLaunchTypeReader(handle),
  budgetReader: createDrizzleBudgetExistsReader(handle),
});

// Os casos de uso REAIS, ligados como na composition.
export const useCases = (repos: Repos) => {
  const clock = ClockFixed(new Date('2026-11-03T12:00:00.000Z'));
  const programCatalog = InMemoryProgramCatalog([
    { ref: PROGRAM_ETI, name: 'Ensino em Tempo Integral', abbreviation: 'ETI', active: true },
    { ref: PROGRAM_PARC, name: 'Parceiros', abbreviation: 'PARC', active: true },
  ]);
  const cloneDeps = {
    costStructureRepo: repos.costStructureRepo,
    budgetResultRepo: repos.budgetResultRepo,
    planCloneWriter: repos.planCloneWriter,
  };
  return {
    createBudgetPlan: createBudgetPlan({
      ...cloneDeps,
      planRepo: repos.planRepo,
      programCatalog,
      clock,
    }),
    addBudget: addBudget({ planRepo: repos.planRepo, clock }),
    addCostCenter: addCostCenter({ costStructureRepo: repos.costStructureRepo }),
    addCategory: addCategory({ costStructureRepo: repos.costStructureRepo }),
    addSubcategory: addSubcategory({ costStructureRepo: repos.costStructureRepo }),
    addBudgetResult: addBudgetResult({
      budgetResultRepo: repos.budgetResultRepo,
      subcategoryReader: repos.subcategoryReader,
      budgetReader: repos.budgetReader,
    }),
    approve: approveBudgetPlan({
      planRepo: repos.planRepo,
      budgetResultRepo: repos.budgetResultRepo,
      clock,
    }),
    startCalibration: startCalibration({ ...cloneDeps, planRepo: repos.planRepo, clock }),
    createScenery: createScenery({ ...cloneDeps, planRepo: repos.planRepo, clock }),
  };
};
export type UseCases = ReturnType<typeof useCases>;

export const must = <T>(r: Result<T, unknown>, what: string): T => {
  if (!r.ok) throw new Error(`${what}: ${String(r.error)}`);
  return r.value;
};

const subIdsOf = (tree: CostStructure): string[] =>
  tree.costCenters.flatMap((cc) =>
    cc.categories.flatMap((c) => c.subcategories.map((s) => String(s.id))),
  );

export type SeededPlan = Readonly<{
  planId: string;
  budgetIds: readonly string[];
  categoryId: string;
  subcategoryIds: readonly string[];
}>;

// Plano montado SÓ pelos casos de uso reais: `budgets` redes, 1 centro → 1 categoria →
// `subcategories` subcategorias IPCA e `months` meses de lançamento (100 centavos) em cada par
// rede × subcategoria. Aprovado quando `approve`.
export const seedPlan = async (
  uc: UseCases,
  opts: Readonly<{
    year: number;
    programRef: string;
    budgets: number;
    subcategories: number;
    months: number;
    approve: boolean;
  }>,
): Promise<SeededPlan> => {
  const plan = must(
    await uc.createBudgetPlan({
      year: opts.year,
      programRef: opts.programRef,
      updatedByRef: ACTOR_REF,
    }),
    'createBudgetPlan',
  ).plan;
  const planId = String(plan.id);
  const budgetIds: string[] = [];
  for (let b = 0; b < opts.budgets; b += 1) {
    const budget = must(
      await uc.addBudget({
        budgetPlanId: planId,
        partnerKind: 'state',
        partnerRef: UFS[b]!,
        updatedByRef: ACTOR_REF,
      }),
      'addBudget',
    );
    budgetIds.push(String(budget.id));
  }
  const withCc = must(
    await uc.addCostCenter({ budgetPlanId: planId, name: 'Pessoal', direction: 'A PAGAR' }),
    'addCostCenter',
  );
  const ccId = String(withCc.costCenters[0]!.id);
  const withCat = must(
    await uc.addCategory({ budgetPlanId: planId, costCenterId: ccId, name: 'Salários' }),
    'addCategory',
  );
  const categoryId = String(withCat.costCenters[0]!.categories[0]!.id);
  let tree = withCat;
  for (let s = 0; s < opts.subcategories; s += 1) {
    tree = must(
      await uc.addSubcategory({
        budgetPlanId: planId,
        categoryId,
        name: `Sub ${String(s).padStart(3, '0')}`,
        launchType: 'IPCA',
      }),
      'addSubcategory',
    );
  }
  const subcategoryIds = subIdsOf(tree);
  for (const budgetId of budgetIds) {
    for (const subcategoryId of subcategoryIds) {
      for (let m = 1; m <= opts.months; m += 1) {
        must(
          await uc.addBudgetResult({
            budgetId,
            subcategoryId,
            month: m,
            input: { kind: 'IPCA', baseValueInCents: 100, ipca: 0 },
          }),
          'addBudgetResult',
        );
      }
    }
  }
  if (opts.approve) {
    must(await uc.approve({ planId, updatedByRef: ACTOR_REF }), 'approve');
  }
  return { planId, budgetIds, categoryId, subcategoryIds };
};

// Limpa na ENTRADA, por tabela (rule testing.md). FK auto-ref: filhos antes dos pais.
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const truncateBudgetPlans = async (h: BudgetPlansMysqlHandle): Promise<void> => {
  await h.db.delete(h.schema.budgetResults);
  await h.db.delete(h.schema.subcategories);
  await h.db.delete(h.schema.categories);
  await h.db.delete(h.schema.costCenters);
  await h.db.delete(h.schema.budgets);
  await deleteAllBudgetPlans(h.db);
};

// Conteúdo de cópia montado direto pelo domínio: plano novo com 1 rede, árvore vazia e `results`
// lançamentos de chaves DISTINTAS (uma subcategoria por lançamento, mês 1).
export const buildCloneContent = (results: number, year = 2026, programRef = PROGRAM_ETI) => {
  const now = new Date('2026-11-03T12:00:00.000Z');
  const actor = must(UserRef.rehydrate(ACTOR_REF), 'actor');
  const created = must(
    BudgetPlan.create({
      id: BudgetPlanId.generate(),
      year,
      programRef: must(ProgramRef.rehydrate(programRef), 'program'),
      now,
      actor,
    }),
    'plan',
  );
  const budgetId = BudgetId.generate();
  const plan = must(
    BudgetPlan.addBudget(
      created.plan,
      {
        id: budgetId,
        partner: { kind: 'state', ref: must(PartnerStateRef.rehydrate('CE'), 'uf') },
      },
      now,
      actor,
    ),
    'budget',
  ).plan;
  const list = Array.from({ length: results }, () =>
    must(
      BudgetResult.create({
        id: BudgetResultId.generate(),
        budgetId,
        subcategoryId: SubcategoryId.generate(),
        month: must(ExerciseMonth.parse(1), 'mês'),
        input: { kind: 'IPCA', baseValueInCents: 100, ipca: 0 },
        subcategoryLaunchType: 'IPCA',
      }),
      'result',
    ),
  );
  return {
    plan,
    budgetId,
    events: [created.event],
    structure: CostStructureOps.empty(plan.id),
    results: list,
  };
};

export type Measurement = Readonly<{
  id: string;
  scenario: string;
  runs: number;
  occurred: number;
  extra?: Readonly<Record<string, unknown>>;
}>;

// Roda o cenário `REPEAT` vezes. `scenario` devolve true quando o achado SE MANIFESTOU.
export const measure = async (
  id: string,
  scenario: string,
  run: (i: number) => Promise<boolean>,
  extra?: () => Readonly<Record<string, unknown>>,
): Promise<Measurement> => {
  let occurred = 0;
  for (let i = 0; i < REPEAT; i += 1) {
    if (await run(i)) occurred += 1;
  }
  const m: Measurement = {
    id,
    scenario,
    runs: REPEAT,
    occurred,
    ...(extra === undefined ? {} : { extra: extra() }),
  };
  process.stdout.write(`MEASURE ${JSON.stringify(m)}\n`);
  return m;
};
