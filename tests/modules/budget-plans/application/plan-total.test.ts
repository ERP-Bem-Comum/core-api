// BGP-BUDGET-TOTAL-DERIVED (#458) — W0 RED — o total do plano é a soma dos lançamentos dos seus
// orçamentos, não mais `Σ budgets[].value` (que era o informado, e a P.O. decidiu que não existe).
//
// `planTotalCents(plan, sumsByBudget)` é pura: recebe o plano (do agregado) e o mapa
// budgetId → soma dos results (do BudgetResultRepository, em lote). Vive no application porque cruza
// dois agregados do módulo — não é operação do agregado BudgetPlan sozinho.
//
// RED esperado: `planTotalCents` ainda não existe.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { planTotalCents } from '#src/modules/budget-plans/application/read-models/plan-total.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';

const NOW = new Date('2026-07-16T12:00:00.000Z');
const ACTOR = (() => {
  const r = UserRef.rehydrate('00000000-0000-4000-8000-000000000001');
  assert.ok(isOk(r));
  return r.value;
})();

const planWithBudgets = (budgetIds: readonly string[]): BudgetPlanEntity => {
  const programRef = ProgramRef.rehydrate('11111111-1111-4111-8111-111111111111');
  assert.ok(isOk(programRef));
  const created = BudgetPlan.create({
    id: BudgetPlanId.generate(),
    year: 2026,
    programRef: programRef.value,
    now: NOW,
    actor: ACTOR,
  });
  assert.ok(isOk(created));
  let plan = created.value.plan;
  const stateRefs = ['CE', 'SP', 'RJ'];
  budgetIds.forEach((id, i) => {
    const ref = PartnerStateRef.rehydrate(stateRefs[i] ?? 'CE');
    assert.ok(isOk(ref));
    const bid = BudgetId.rehydrate(id);
    assert.ok(isOk(bid));
    // addBudget não recebe mais valor (#458): criar orçamento é só a Rede.
    const added = BudgetPlan.addBudget(
      plan,
      { id: bid.value, partner: { kind: 'state', ref: ref.value } },
      NOW,
      ACTOR,
    );
    assert.ok(isOk(added));
    plan = added.value.plan;
  });
  return plan;
};

const B1 = '10000000-0000-4000-8000-000000000001';
const B2 = '20000000-0000-4000-8000-000000000002';

describe('planTotalCents — soma dos lançamentos dos orçamentos do plano (#458)', () => {
  it('soma as parcelas de cada orçamento a partir do mapa', () => {
    const plan = planWithBudgets([B1, B2]);
    const sums = new Map<string, number>([
      [B1, 104500],
      [B2, 30000],
    ]);
    assert.equal(planTotalCents(plan, sums), 134500);
  });

  it('CA3: orçamento sem lançamento conta 0, não "ausente"', () => {
    const plan = planWithBudgets([B1, B2]);
    const sums = new Map<string, number>([[B1, 104500]]); // B2 não tem entrada
    assert.equal(planTotalCents(plan, sums), 104500);
  });

  it('plano sem orçamentos → 0', () => {
    const plan = planWithBudgets([]);
    assert.equal(planTotalCents(plan, new Map()), 0);
  });

  it('ignora somas de budgets que não são deste plano (escopo pelo agregado)', () => {
    const plan = planWithBudgets([B1]);
    const sums = new Map<string, number>([
      [B1, 500],
      ['99999999-9999-4999-8999-999999999999', 999999], // de outro plano
    ]);
    assert.equal(planTotalCents(plan, sums), 500);
  });
});
