// BGP-BUDGET-TOTAL-DERIVED (#458) — W0 RED — o total do plano é a soma dos lançamentos dos seus
// orçamentos, não mais `Σ budgets[].value` (que era o informado, e a P.O. decidiu que não existe).
//
// `planTotal(plan, sumsByBudget)` é pura: recebe o plano (do agregado) e o mapa
// budgetId → soma dos results (do BudgetResultRepository, em lote). Vive no application porque cruza
// dois agregados do módulo — não é operação do agregado BudgetPlan sozinho.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import {
  planTotal,
  sumMoney,
} from '#src/modules/budget-plans/application/read-models/plan-total.ts';
import * as Money from '#src/shared/kernel/money.ts';
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

const money = (cents: number): Money.Money => {
  const m = Money.fromCents(cents);
  assert.ok(isOk(m));
  return m.value;
};

const sumsOf = (entries: readonly (readonly [string, number])[]): Map<string, Money.Money> =>
  new Map(entries.map(([id, cents]) => [id, money(cents)]));

const totalCents = (plan: BudgetPlanEntity, sums: ReadonlyMap<string, Money.Money>): number => {
  const total = planTotal(plan, sums);
  assert.ok(isOk(total));
  return total.value.cents;
};

const MAX = Number.MAX_SAFE_INTEGER;

describe('planTotal — soma dos lançamentos dos orçamentos do plano (#458)', () => {
  it('soma as parcelas de cada orçamento a partir do mapa', () => {
    const plan = planWithBudgets([B1, B2]);
    assert.equal(
      totalCents(
        plan,
        sumsOf([
          [B1, 104500],
          [B2, 30000],
        ]),
      ),
      134500,
    );
  });

  it('CA3: orçamento sem entrada no mapa conta zero', () => {
    const plan = planWithBudgets([B1, B2]);
    assert.equal(totalCents(plan, sumsOf([[B1, 104500]])), 104500);
  });

  it('plano sem orçamentos → 0', () => {
    const plan = planWithBudgets([]);
    assert.equal(totalCents(plan, new Map()), 0);
  });

  it('entrada de orçamento de outro plano é ignorada', () => {
    const plan = planWithBudgets([B1]);
    const sums = sumsOf([
      [B1, 500],
      ['99999999-9999-4999-8999-999999999999', 999999],
    ]);
    assert.equal(totalCents(plan, sums), 500);
  });

  it('total igual a MAX_SAFE_INTEGER é aceito', () => {
    const plan = planWithBudgets([B1, B2]);
    const sums = sumsOf([
      [B1, MAX - 1],
      [B2, 1],
    ]);
    assert.equal(totalCents(plan, sums), MAX);
  });

  it('total acima de MAX_SAFE_INTEGER → budget-plan-total-exceeds-safe-integer', () => {
    const plan = planWithBudgets([B1, B2]);
    const sums = sumsOf([
      [B1, MAX],
      [B2, 1],
    ]);
    assert.deepEqual(planTotal(plan, sums), {
      ok: false,
      error: 'budget-plan-total-exceeds-safe-integer',
    });
  });
});

describe('sumMoney — soma por Money.add', () => {
  it('sem parcelas devolve Money.ZERO', () => {
    assert.deepEqual(sumMoney([]), { ok: true, value: Money.ZERO });
  });

  it('soma as parcelas', () => {
    const r = sumMoney([money(5_000_000_000_000_000), money(4_007_199_254_740_991)]);
    assert.ok(isOk(r));
    assert.equal(r.value.cents, MAX);
  });

  it('soma acima de MAX_SAFE_INTEGER → money-exceeds-safe-integer', () => {
    assert.deepEqual(sumMoney([money(5_000_000_000_000_000), money(5_000_000_000_000_000)]), {
      ok: false,
      error: 'money-exceeds-safe-integer',
    });
  });
});
