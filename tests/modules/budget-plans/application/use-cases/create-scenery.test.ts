// BDG-PLAN-LIFECYCLE (US4/CA4) — createScenery: deriva um cenário RASCUNHO nomeado de um plano
// não-aprovado e clona o conteúdo (mesma helper clonePlanContent do startCalibration). Foco: a
// derivação de cenário (versão minor+1, scenarioName) + guards; a clonagem profunda já é coberta em
// start-calibration.test.ts.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import { ProgramRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as CostStructure from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.in-memory.ts';
import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { createScenery } from '#src/modules/budget-plans/application/use-cases/create-scenery.ts';

const NOW = new Date('2026-07-09T12:00:00.000Z');
const PROGRAM = '11111111-1111-4111-8111-111111111111';
// Ator padrão dos testes (BGP-UPDATED-BY-AUDIT/#373).
const ACTOR_REF = '00000000-0000-4000-8000-000000000001';
const ACTOR = (() => {
  const r = UserRef.rehydrate(ACTOR_REF);
  assert.ok(isOk(r));
  return r.value;
})();

const buildDeps = () => ({
  planStore: InMemoryBudgetPlanRepository(),
  costStore: InMemoryCostStructureRepository(),
  resultStore: InMemoryBudgetResultRepository(),
  clock: ClockFixed(NOW),
});

const seedPlanWithTree = async (deps: ReturnType<typeof buildDeps>, approve: boolean) => {
  const planId = BudgetPlanId.generate();
  const programRef = ProgramRef.rehydrate(PROGRAM);
  assert.ok(isOk(programRef));
  const created = BudgetPlan.create({
    id: planId,
    year: 2026,
    programRef: programRef.value,
    now: NOW,
    actor: ACTOR,
  });
  assert.ok(isOk(created));
  let plan = created.value.plan; // RASCUNHO
  if (approve) {
    const approved = BudgetPlan.approve(plan, NOW, ACTOR);
    assert.ok(isOk(approved));
    plan = approved.value.plan;
  }
  assert.ok(isOk(await deps.planStore.repo.save(plan, [])));

  const ccId = CostCenterId.generate();
  const catId = CategoryId.generate();
  const s0 = CostStructure.empty(planId);
  const cc = CostStructure.addCostCenter(
    s0,
    { id: ccId, name: 'Pessoal', direction: 'A PAGAR' },
    'RASCUNHO',
  );
  assert.ok(isOk(cc));
  const cat = CostStructure.addCategory(
    cc.value,
    { id: catId, costCenterId: ccId, name: 'Salários' },
    'RASCUNHO',
  );
  assert.ok(isOk(cat));
  const sub = CostStructure.addSubcategory(
    cat.value,
    { id: SubcategoryId.generate(), categoryId: catId, name: 'CLT', launchType: 'IPCA' },
    'RASCUNHO',
  );
  assert.ok(isOk(sub));
  assert.ok(isOk(await deps.costStore.repo.save(sub.value)));
  return planId;
};

describe('createScenery (use case) — US4/CA4', () => {
  it('deriva cenário RASCUNHO (version minor+1, scenarioName) e clona a árvore', async () => {
    const deps = buildDeps();
    const planId = await seedPlanWithTree(deps, false);

    const r = await createScenery({
      planRepo: deps.planStore.repo,
      costStructureRepo: deps.costStore.repo,
      budgetResultRepo: deps.resultStore.repo,
      clock: deps.clock,
    })({ parentPlanId: String(planId), name: 'Otimista', updatedByRef: ACTOR_REF });

    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'RASCUNHO');
    assert.equal(r.value.plan.scenarioName, 'Otimista');
    assert.equal(r.value.plan.version.minor, 1);
    assert.equal(String(r.value.plan.parentId), String(planId));
    assert.equal(r.value.plan.updatedByRef, ACTOR_REF, 'CA6: derivador seta updatedByRef');

    const childStruct = await deps.costStore.repo.findByBudgetPlanId(r.value.plan.id);
    assert.ok(isOk(childStruct));
    assert.equal(childStruct.value.costCenters.length, 1);
  });

  it('nome vazio → scenario-name-required', async () => {
    const deps = buildDeps();
    const planId = await seedPlanWithTree(deps, false);
    const r = await createScenery({
      planRepo: deps.planStore.repo,
      costStructureRepo: deps.costStore.repo,
      budgetResultRepo: deps.resultStore.repo,
      clock: deps.clock,
    })({ parentPlanId: String(planId), name: '   ', updatedByRef: ACTOR_REF });
    assert.ok(isErr(r));
    assert.equal(r.error, 'scenario-name-required');
  });

  it('plano APROVADO não gera cenário → budget-plan-already-approved', async () => {
    const deps = buildDeps();
    const planId = await seedPlanWithTree(deps, true);
    const r = await createScenery({
      planRepo: deps.planStore.repo,
      costStructureRepo: deps.costStore.repo,
      budgetResultRepo: deps.resultStore.repo,
      clock: deps.clock,
    })({ parentPlanId: String(planId), name: 'X', updatedByRef: ACTOR_REF });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-already-approved');
  });
});
