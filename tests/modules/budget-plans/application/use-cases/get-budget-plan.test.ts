/**
 * BGP-PLAN-CRUD — W0 (RED) — use case getBudgetPlan (issue #315, CA4).
 *
 * Detalhe = cabeçalho + orçamentos por Rede (1 por parceiro) + totalInCents
 * (soma dos budgets). Budgets são semeados via domínio+repo — a criação de
 * orçamento por HTTP é a Fatia 3 (#317).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import {
  PartnerStateRef,
  PartnerMunicipalityRef,
} from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import { getBudgetPlan } from '#src/modules/budget-plans/application/use-cases/get-budget-plan.ts';
import {
  makeDeps,
  createPlanOrFail,
  NOW,
  PROGRAM_ETI_REF,
  ACTOR_REF,
  STATE_CE_REF,
  MUN_FORTALEZA_REF,
} from './_support.ts';

const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const ACTOR = (() => {
  const r = UserRef.rehydrate(ACTOR_REF);
  assert.ok(isOk(r));
  return r.value;
})();

describe('getBudgetPlan', () => {
  it('CA4: cabeçalho + budgets por Rede + totalInCents = soma', async () => {
    const deps = makeDeps();
    const plan = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    const stateRef = PartnerStateRef.rehydrate(STATE_CE_REF);
    assert.ok(isOk(stateRef));
    const munRef = PartnerMunicipalityRef.rehydrate(MUN_FORTALEZA_REF);
    assert.ok(isOk(munRef));

    const b1 = BudgetPlan.addBudget(
      plan,
      {
        id: BudgetId.generate(),
        partner: { kind: 'state', ref: stateRef.value },
      },
      NOW,
      ACTOR,
    );
    assert.ok(isOk(b1));
    const b2 = BudgetPlan.addBudget(
      b1.value.plan,
      {
        id: BudgetId.generate(),
        partner: { kind: 'municipality', ref: munRef.value },
      },
      NOW,
      ACTOR,
    );
    assert.ok(isOk(b2));
    const saved = await deps.planRepo.save(b2.value.plan, []);
    assert.ok(isOk(saved));

    const r = await getBudgetPlan(deps)(String(plan.id));
    assert.ok(isOk(r));
    assert.equal(r.value.year, 2026);
    assert.equal(r.value.status, 'RASCUNHO');
    assert.equal(r.value.version, '1.0');
    assert.equal(r.value.programName, 'Ensino em Tempo Integral');
    assert.equal(r.value.budgets.length, 2);
    // #458: total agora derivado dos lançamentos (bgp_budget_results); sem results semeados → 0.
    // Coberto em plan-total.test.ts e budget-total-derived.routes.test.ts.
    assert.equal(r.value.totalInCents, 0);

    const kinds = r.value.budgets.map((b) => b.partner.kind).sort();
    assert.deepEqual(kinds, ['municipality', 'state']);
  });

  it('plano recém-criado -> budgets vazios e totalInCents 0', async () => {
    const deps = makeDeps();
    const plan = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    const r = await getBudgetPlan(deps)(String(plan.id));
    assert.ok(isOk(r));
    assert.deepEqual(r.value.budgets, []);
    assert.equal(r.value.totalInCents, 0);
  });

  it('id inexistente -> budget-plan-not-found', async () => {
    const r = await getBudgetPlan(makeDeps())(UUID_INEXISTENTE);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-found');
  });

  it('id malformado -> budget-plan-id-invalid', async () => {
    const r = await getBudgetPlan(makeDeps())('nao-e-uuid');
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-id-invalid');
  });
});
