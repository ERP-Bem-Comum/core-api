// BDG-BUDGET-CALC (#317) — CA4: deleteBudget remove o orçamento do plano E seus resultados
// dependentes (delete explícito, D2). No HTTP memory o reader não conecta ao budget dinâmico, então
// o CA4 completo é provado aqui, no use case, com repos consistentes.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { deleteBudget } from '#src/modules/budget-plans/application/use-cases/delete-budget.ts';

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

const seedPlanWithBudget = async (
  planStore: ReturnType<typeof InMemoryBudgetPlanRepository>,
): Promise<{ planId: BudgetPlanId.BudgetPlanId; budgetId: BudgetId.BudgetId }> => {
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
  const withBudget = BudgetPlan.addBudget(
    created.value.plan,
    { id: budgetId, partner: { kind: 'state', ref: stateRef.value }, value: money.value },
    NOW,
    ACTOR,
  );
  assert.ok(isOk(withBudget));
  assert.ok(isOk(await planStore.repo.save(withBudget.value.plan, [])));
  return { planId, budgetId };
};

describe('deleteBudget (use case) — CA4', () => {
  it('remove o orçamento do plano E seus resultados dependentes', async () => {
    const clock = ClockFixed(NOW);
    const planStore = InMemoryBudgetPlanRepository();
    const resultStore = InMemoryBudgetResultRepository();
    const { planId, budgetId } = await seedPlanWithBudget(planStore);

    const result = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId,
      subcategoryId: SubcategoryId.generate(),
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
      subcategoryLaunchType: 'IPCA',
    });
    assert.ok(isOk(result));
    assert.ok(isOk(await resultStore.repo.add(result.value)));

    const r = await deleteBudget({
      planRepo: planStore.repo,
      budgetResultRepo: resultStore.repo,
      clock,
    })({ budgetPlanId: String(planId), budgetId: String(budgetId), updatedByRef: ACTOR_REF });
    assert.ok(isOk(r));

    const list = await resultStore.repo.listByBudgetId(budgetId);
    assert.ok(isOk(list));
    assert.equal(list.value.length, 0);

    const plan = await planStore.repo.findById(planId);
    assert.ok(isOk(plan));
    assert.equal(plan.value?.budgets.length, 0);
    assert.equal(plan.value?.updatedByRef, ACTOR_REF, 'CA6: removeBudget seta updatedByRef');
  });

  it('budget inexistente -> budget-not-found', async () => {
    const clock = ClockFixed(NOW);
    const planStore = InMemoryBudgetPlanRepository();
    const resultStore = InMemoryBudgetResultRepository();
    const { planId } = await seedPlanWithBudget(planStore);

    const r = await deleteBudget({
      planRepo: planStore.repo,
      budgetResultRepo: resultStore.repo,
      clock,
    })({
      budgetPlanId: String(planId),
      budgetId: String(BudgetId.generate()),
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-not-found');
  });
});
