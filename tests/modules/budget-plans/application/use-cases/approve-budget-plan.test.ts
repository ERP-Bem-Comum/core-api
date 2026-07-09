// BDG-PLAN-LIFECYCLE (US4/CA2) — approveBudgetPlan: transição → APROVADO + guards.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { ProgramRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { approveBudgetPlan } from '#src/modules/budget-plans/application/use-cases/approve-budget-plan.ts';

const NOW = new Date('2026-07-09T12:00:00.000Z');
const PROGRAM = '11111111-1111-4111-8111-111111111111';

const seedPlan = async (
  planStore: ReturnType<typeof InMemoryBudgetPlanRepository>,
  approve: boolean,
) => {
  const planId = BudgetPlanId.generate();
  const programRef = ProgramRef.rehydrate(PROGRAM);
  assert.ok(isOk(programRef));
  const created = BudgetPlan.create({
    id: planId,
    year: 2026,
    programRef: programRef.value,
    now: NOW,
  });
  assert.ok(isOk(created));
  let plan = created.value.plan;
  if (approve) {
    const a = BudgetPlan.approve(plan, NOW);
    assert.ok(isOk(a));
    plan = a.value.plan;
  }
  assert.ok(isOk(await planStore.repo.save(plan, [])));
  return planId;
};

describe('approveBudgetPlan (use case) — US4/CA2', () => {
  it('RASCUNHO → APROVADO', async () => {
    const planStore = InMemoryBudgetPlanRepository();
    const planId = await seedPlan(planStore, false);
    const r = await approveBudgetPlan({ planRepo: planStore.repo, clock: ClockFixed(NOW) })({
      planId: String(planId),
    });
    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'APROVADO');
    const persisted = await planStore.repo.findById(planId);
    assert.ok(isOk(persisted));
    assert.equal(persisted.value?.status, 'APROVADO');
  });

  it('já APROVADO → budget-plan-already-approved', async () => {
    const planStore = InMemoryBudgetPlanRepository();
    const planId = await seedPlan(planStore, true);
    const r = await approveBudgetPlan({ planRepo: planStore.repo, clock: ClockFixed(NOW) })({
      planId: String(planId),
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-already-approved');
  });

  it('plano inexistente → budget-plan-not-found', async () => {
    const planStore = InMemoryBudgetPlanRepository();
    const r = await approveBudgetPlan({ planRepo: planStore.repo, clock: ClockFixed(NOW) })({
      planId: '00000000-0000-4000-8000-000000000000',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-found');
  });
});
