// BDG-PLAN-LIFECYCLE (US4) — W1-C RED. Orquestração da clonagem: startCalibration deriva um filho
// EM_CALIBRACAO de um plano APROVADO E clona o conteúdo (cost-structure + budgets + budget_results),
// remapeando ids via os mapas. O aprovado permanece intacto.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as CostStructure from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.in-memory.ts';
import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { startCalibration } from '#src/modules/budget-plans/application/use-cases/start-calibration.ts';

const NOW = new Date('2026-07-09T12:00:00.000Z');
const PROGRAM = '11111111-1111-4111-8111-111111111111';
const STATE = 'CE';
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

// Semeia um plano APROVADO com 1 budget, árvore (cc→cat→2 subs) e 2 budget_results.
const seedApprovedPlan = async (deps: ReturnType<typeof buildDeps>) => {
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
  const stateRef = PartnerStateRef.rehydrate(STATE);
  assert.ok(isOk(stateRef));
  const money = Money.fromCents(500000);
  assert.ok(isOk(money));
  const budgetId = BudgetId.generate();
  let plan = created.value.plan;
  const withBudget = BudgetPlan.addBudget(
    plan,
    { id: budgetId, partner: { kind: 'state', ref: stateRef.value }, value: money.value },
    NOW,
    ACTOR,
  );
  assert.ok(isOk(withBudget));
  plan = withBudget.value.plan;
  const approved = BudgetPlan.approve(plan, NOW, ACTOR);
  assert.ok(isOk(approved));
  assert.ok(isOk(await deps.planStore.repo.save(approved.value.plan, [])));

  // árvore: cc → cat → sub CLT/IPCA + sub PJ/CAED
  const ccId = CostCenterId.generate();
  const catId = CategoryId.generate();
  const subA = SubcategoryId.generate();
  const s = CostStructure.empty(planId);
  const cc = CostStructure.addCostCenter(
    s,
    { id: ccId, name: 'Pessoal', direction: 'A PAGAR' },
    'EM_CALIBRACAO',
  );
  assert.ok(isOk(cc));
  const cat = CostStructure.addCategory(
    cc.value,
    { id: catId, costCenterId: ccId, name: 'Salários' },
    'EM_CALIBRACAO',
  );
  assert.ok(isOk(cat));
  const sub = CostStructure.addSubcategory(
    cat.value,
    { id: subA, categoryId: catId, name: 'CLT', launchType: 'IPCA' },
    'EM_CALIBRACAO',
  );
  assert.ok(isOk(sub));
  assert.ok(isOk(await deps.costStore.repo.save(sub.value)));

  // 1 budget_result na subcategoria CLT
  const res = BudgetResult.create({
    id: BudgetResultId.generate(),
    budgetId,
    subcategoryId: subA,
    input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
    subcategoryLaunchType: 'IPCA',
  });
  assert.ok(isOk(res));
  assert.ok(isOk(await deps.resultStore.repo.add(res.value)));

  return { planId, budgetId, subA };
};

describe('startCalibration (use case) — US4 orquestração da clonagem', () => {
  it('CA1: deriva filho EM_CALIBRACAO e clona árvore + budgets + results com novos ids', async () => {
    const deps = buildDeps();
    const { planId, budgetId, subA } = await seedApprovedPlan(deps);

    const r = await startCalibration({
      planRepo: deps.planStore.repo,
      costStructureRepo: deps.costStore.repo,
      budgetResultRepo: deps.resultStore.repo,
      clock: deps.clock,
    })({ parentPlanId: String(planId), updatedByRef: ACTOR_REF });

    assert.ok(isOk(r));
    const child = r.value.plan;
    assert.equal(child.status, 'EM_CALIBRACAO');
    assert.equal(String(child.parentId), String(planId));
    assert.equal(child.version.major, 2); // pai versão 1.0 (create) → calibração 2.0
    assert.notEqual(String(child.id), String(planId));
    assert.equal(child.updatedByRef, ACTOR_REF, 'CA6: derivador seta updatedByRef');

    // budget clonado (novo id, mesmo valor)
    assert.equal(child.budgets.length, 1);
    const childBudgetId = child.budgets[0]?.id;
    assert.ok(childBudgetId !== undefined);
    assert.notEqual(String(childBudgetId), String(budgetId));

    // cost-structure clonada
    const childStruct = await deps.costStore.repo.findByBudgetPlanId(child.id);
    assert.ok(isOk(childStruct));
    assert.equal(childStruct.value.costCenters.length, 1);
    const childSub = childStruct.value.costCenters[0]?.categories[0]?.subcategories[0];
    assert.notEqual(String(childSub?.id), String(subA)); // subcategoria com id novo

    // budget_results clonados (novo budgetId + subcategoryId, mesmo valor)
    assert.ok(childBudgetId !== undefined);
    const childResults = await deps.resultStore.repo.listByBudgetId(childBudgetId);
    assert.ok(isOk(childResults));
    assert.equal(childResults.value.length, 1);
    assert.equal(childResults.value[0]?.value.cents, 104500);
    assert.equal(String(childResults.value[0]?.subcategoryId), String(childSub?.id));

    // aprovado intacto
    const parent = await deps.planStore.repo.findById(planId);
    assert.ok(isOk(parent));
    assert.equal(parent.value?.status, 'APROVADO');
  });

  it('plano não-APROVADO → budget-plan-not-approved (não clona)', async () => {
    const deps = buildDeps();
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
    assert.ok(isOk(await deps.planStore.repo.save(created.value.plan, []))); // RASCUNHO

    const r = await startCalibration({
      planRepo: deps.planStore.repo,
      costStructureRepo: deps.costStore.repo,
      budgetResultRepo: deps.resultStore.repo,
      clock: deps.clock,
    })({ parentPlanId: String(planId), updatedByRef: ACTOR_REF });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-approved');
  });
});
