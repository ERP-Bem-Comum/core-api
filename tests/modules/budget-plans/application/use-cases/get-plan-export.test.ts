// BDG-CONSOLIDATED-CSV (US5) — W0 RED — loader da seção de export (base do CSV, CA2 + CA3).
// getPlanExport resolve, para um plano, os dados achatados que o projetor CSV consome: rótulo do
// plano (ano + nome do programa + versão), orçamentos com nome do parceiro (Rede), subcategorias da
// árvore de custos (com centro de custo/categoria/tipo) e os valores por (orçamento × subcategoria).
// getConsolidatedExport faz o mesmo para todas as raízes aprovadas do ano (CA2).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { CostStructure } from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import type { BudgetResult } from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.in-memory.ts';
import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { InMemoryProgramCatalog } from '#src/modules/budget-plans/adapters/catalog/program-catalog.in-memory.ts';
import { InMemoryPartnerNetwork } from '#src/modules/budget-plans/adapters/network/partner-network.in-memory.ts';
import { getPlanExport } from '#src/modules/budget-plans/application/use-cases/get-plan-export.ts';
import { getConsolidatedExport } from '#src/modules/budget-plans/application/use-cases/get-consolidated-export.ts';

import {
  NOW,
  seedPrograms,
  seedStates,
  seedMunicipalities,
  PROGRAM_ETI_REF,
  PROGRAM_PARC_REF,
  STATE_CE_REF,
} from './_support.ts';

// Ator padrão dos testes (BGP-UPDATED-BY-AUDIT/#373).
const ACTOR = (() => {
  const r = UserRef.rehydrate('00000000-0000-4000-8000-000000000001');
  assert.ok(isOk(r));
  return r.value;
})();

// #413 — mês do exercício nas fixtures (o VO tem suíte própria; aqui mês inválido é erro de teste).
const FIXTURE_MONTH = (() => {
  const m = ExerciseMonth.parse(1);
  assert.ok(isOk(m));
  return m.value;
})();

const makeExportDeps = () => {
  const { repo: planRepo } = InMemoryBudgetPlanRepository();
  const costStructureRepo = InMemoryCostStructureRepository(async (id) => {
    const found = await planRepo.findById(id);
    return found.ok && found.value !== null ? found.value.status : null;
  }).repo;
  const budgetResultRepo = InMemoryBudgetResultRepository().repo;
  return {
    planRepo,
    costStructureRepo,
    budgetResultRepo,
    programCatalog: InMemoryProgramCatalog(seedPrograms),
    partnerNetwork: InMemoryPartnerNetwork({
      states: seedStates,
      municipalities: seedMunicipalities,
    }),
  };
};

type ExportDeps = ReturnType<typeof makeExportDeps>;

// Semeia um plano aprovado com 1 orçamento (estado CE), árvore 1×1×2 subcategorias e 1 budget_result.
const seedPlanWithTree = async (
  deps: ExportDeps,
  spec: Readonly<{ approve: boolean; programRef?: string }>,
): Promise<
  Readonly<{ plan: BudgetPlanEntity; subcategoryIds: readonly string[]; budgetId: string }>
> => {
  const programRef = ProgramRef.rehydrate(spec.programRef ?? PROGRAM_ETI_REF);
  assert.ok(isOk(programRef));
  const created = BudgetPlan.create({
    id: BudgetPlanId.generate(),
    year: 2026,
    programRef: programRef.value,
    now: NOW,
    actor: ACTOR,
  });
  assert.ok(isOk(created));
  const stateRef = PartnerStateRef.rehydrate(STATE_CE_REF);
  assert.ok(isOk(stateRef));
  const value = Money.fromCents(123_456);
  assert.ok(isOk(value));
  const budgetId = BudgetId.generate();
  const withBudget = BudgetPlan.addBudget(
    created.value.plan,
    { id: budgetId, partner: { kind: 'state', ref: stateRef.value }, value: value.value },
    NOW,
    ACTOR,
  );
  assert.ok(isOk(withBudget));
  let plan = withBudget.value.plan;
  if (spec.approve) {
    const approved = BudgetPlan.approve(plan, NOW, ACTOR);
    assert.ok(isOk(approved));
    plan = approved.value.plan;
  }
  assert.ok(isOk(await deps.planRepo.save(plan, [])));

  const sub1 = SubcategoryId.generate();
  const sub2 = SubcategoryId.generate();
  const structure: CostStructure = {
    budgetPlanId: plan.id,
    costCenters: [
      {
        id: CostCenterId.generate(),
        name: 'Operacional',
        direction: 'A PAGAR',
        categories: [
          {
            id: CategoryId.generate(),
            name: 'Pessoal',
            subcategories: [
              { id: sub1, name: 'Salários', launchType: 'DESPESAS_PESSOAIS' },
              { id: sub2, name: 'Frete', launchType: 'DESPESAS_LOGISTICAS' },
            ],
          },
        ],
      },
    ],
  };
  assert.ok(isOk(await deps.costStructureRepo.save(structure)));

  const result: BudgetResult = {
    id: BudgetResultId.generate(),
    budgetId,
    subcategoryId: sub1,
    month: FIXTURE_MONTH,
    model: 'DESPESAS_PESSOAIS',
    value: value.value,
  };
  assert.ok(isOk(await deps.budgetResultRepo.save(result)));

  return { plan, subcategoryIds: [String(sub1), String(sub2)], budgetId: String(budgetId) };
};

describe('getPlanExport — achata plano aprovado em seção de CSV', () => {
  it('CA3: resolve rótulo, parceiro, subcategorias e valores', async () => {
    const deps = makeExportDeps();
    const { plan, subcategoryIds, budgetId } = await seedPlanWithTree(deps, { approve: true });

    const r = await getPlanExport(deps)({ planId: String(plan.id) });
    assert.ok(isOk(r));
    const section = r.value;
    assert.equal(section.planId, String(plan.id));
    assert.equal(section.planLabel, '2026 Ensino em Tempo Integral 1');
    assert.equal(section.budgets.length, 1);
    assert.equal(section.budgets[0]?.partnerName, 'Ceará');
    assert.equal(section.subcategories.length, 2);
    const salarios = section.subcategories.find((s) => s.name === 'Salários');
    assert.ok(salarios !== undefined);
    assert.equal(salarios.costCenterName, 'Operacional');
    assert.equal(salarios.categoryName, 'Pessoal');
    assert.equal(salarios.launchType, 'DESPESAS_PESSOAIS');
    // Valor só para (budget × sub1); sub2 ausente (vira R$ 0,00 no CSV).
    assert.equal(section.values.length, 1);
    assert.equal(section.values[0]?.budgetId, budgetId);
    assert.equal(section.values[0]?.subcategoryId, subcategoryIds[0]);
    assert.equal(section.values[0]?.valueCents, 123_456);
  });

  it('plano inexistente → budget-plan-not-found', async () => {
    const deps = makeExportDeps();
    const r = await getPlanExport(deps)({ planId: '00000000-0000-4000-8000-000000000000' });
    assert.ok(!r.ok);
    assert.equal(r.error, 'budget-plan-not-found');
  });

  it('plano não aprovado → plan-not-approved-for-consolidation', async () => {
    const deps = makeExportDeps();
    const { plan } = await seedPlanWithTree(deps, { approve: false }); // RASCUNHO
    const r = await getPlanExport(deps)({ planId: String(plan.id) });
    assert.ok(!r.ok);
    assert.equal(r.error, 'plan-not-approved-for-consolidation');
  });
});

describe('getConsolidatedExport — seções da vigente de cada família aprovada do ano (CA2)', () => {
  it('devolve 1 seção por família aprovada (ETI + PARC); rascunho excluído', async () => {
    const deps = makeExportDeps();
    await seedPlanWithTree(deps, { approve: true, programRef: PROGRAM_ETI_REF });
    await seedPlanWithTree(deps, { approve: true, programRef: PROGRAM_PARC_REF });
    await seedPlanWithTree(deps, { approve: false, programRef: PROGRAM_ETI_REF }); // RASCUNHO — excluído

    const r = await getConsolidatedExport(deps)({ year: 2026 });
    assert.ok(isOk(r));
    assert.equal(r.value.length, 2);
  });
});
