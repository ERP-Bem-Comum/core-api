// BGP-DELETE-BUDGET-ATOMIC (#377) — W0 RED — `deleteBudget` deixa de fazer `planRepo.save` +
// `budgetResultRepo.deleteByBudgetId` em 2 awaits (resultados orfaos se o 2o falha) e passa a delegar
// a UM metodo atomico `planRepo.removeBudget(plan, budgetId, events)`: persiste o plano-sem-o-budget E
// apaga os bgp_budget_results daquele budgetId na MESMA operacao (mesma db.transaction no drizzle).
//
// DEVE FALHAR em W0: a nova assinatura de deps ({ planRepo, clock }) e o metodo `removeBudget` ainda nao
// existem — o use-case atual ainda toca `deps.budgetResultRepo`, que aqui deixa de ser injetado.
//
// Estrategia (Beck, red-green-refactor): usa FAKES que registram estado (nao mocks). O fake do
// BudgetPlanRepository envelopa o InMemory real (plano) + um store de results co-localizado, e expoe um
// `removeBudget` atomico controlavel — quando `failRemove`, retorna erro SEM mutar nada (rollback
// conceitual). Assim CA1 (falha parcial reverte tudo) e CA2 (caminho feliz) sao provados no use-case,
// e a atomicidade real (tx MySQL) fica no companion `remove-budget-atomic.drizzle-mysql.test.ts` (CA4).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { type Result, err } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { BudgetPlanRepositoryError } from '#src/modules/budget-plans/domain/budget-plan/repository.ts';
import type { BudgetPlansModuleEvent } from '#src/modules/budget-plans/public-api/events.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { deleteBudget } from '#src/modules/budget-plans/application/use-cases/delete-budget.ts';

// #413 — mês do exercício nas fixtures. O VO tem suíte própria (exercise-month.test.ts); aqui um
// mês inválido seria erro de teste, não de domínio.
const FIXTURE_MONTH = (() => {
  const m = ExerciseMonth.parse(1);
  if (!m.ok) throw new Error('fixture inválida: mês');
  return m.value;
})();

const NOW = new Date('2026-07-09T12:00:00.000Z');
const PROGRAM = '11111111-1111-4111-8111-111111111111';
const STATE = 'CE';
// Ator padrao dos testes (BGP-UPDATED-BY-AUDIT/#373).
const ACTOR_REF = '00000000-0000-4000-8000-000000000001';
const ACTOR = (() => {
  const r = UserRef.rehydrate(ACTOR_REF);
  assert.ok(isOk(r));
  return r.value;
})();

// Constroi um plano com 1 orcamento + 1 resultado dependente daquele orcamento.
const build = () => {
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
  const resultR = BudgetResult.create({
    id: BudgetResultId.generate(),
    budgetId,
    subcategoryId: SubcategoryId.generate(),
    month: FIXTURE_MONTH,
    input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
    subcategoryLaunchType: 'IPCA',
  });
  assert.ok(isOk(resultR));
  return { planWithBudget: withBudget.value.plan, planId, budgetId, result: resultR.value };
};

// Fake do BudgetPlanRepository que registra estado. Envelopa o InMemory real (plano) + um store de
// results co-localizado. `removeBudget` e atomico: no sucesso persiste o plano-sem-o-budget E apaga os
// results daquele budget juntos; em `failRemove`, retorna erro SEM mutar nada (rollback conceitual).
// Espia chamadas: `removeCalls` (metodo atomico novo) e `saveCalls` (save generico do port — NAO deve
// ser usado pelo caminho de delete apos a mudanca).
const makeAtomicFakeRepo = (opts: Readonly<{ failRemove: boolean }>) => {
  const planStore = InMemoryBudgetPlanRepository();
  const resultStore = InMemoryBudgetResultRepository();
  let removeCalls = 0;
  let saveCalls = 0;

  const repo = {
    ...planStore.repo,
    save: async (plan: BudgetPlanEntity, events: readonly BudgetPlansModuleEvent[]) => {
      saveCalls += 1;
      return planStore.repo.save(plan, events);
    },
    removeBudget: async (
      plan: BudgetPlanEntity,
      budgetId: BudgetId.BudgetId,
      events: readonly BudgetPlansModuleEvent[],
    ): Promise<Result<void, BudgetPlanRepositoryError>> => {
      removeCalls += 1;
      if (opts.failRemove) return err('budget-plan-repo-unavailable'); // rollback atomico: nada muda
      const saved = await planStore.repo.save(plan, events);
      if (!saved.ok) return saved;
      // Store in-memory nunca falha; mapeia o erro do result-repo p/ o union do port (completude de tipos).
      const deleted = await resultStore.repo.deleteByBudgetId(budgetId);
      return deleted.ok ? deleted : err('budget-plan-repo-unavailable');
    },
  };

  return {
    repo,
    planStore,
    resultStore,
    removeCalls: () => removeCalls,
    saveCalls: () => saveCalls,
  };
};

const seed = async (fake: ReturnType<typeof makeAtomicFakeRepo>) => {
  const { planWithBudget, planId, budgetId, result } = build();
  // Semeia via os stores internos (nao pelo wrapper `save`) para nao inflar `saveCalls`.
  assert.ok(isOk(await fake.planStore.repo.save(planWithBudget, [])));
  assert.ok(isOk(await fake.resultStore.repo.save(result)));
  return { planId, budgetId };
};

describe('deleteBudget (use case) — BGP-DELETE-BUDGET-ATOMIC #377', () => {
  it('CA2 caminho feliz: delega ao removeBudget e some com budget + results juntos', async () => {
    const clock = ClockFixed(NOW);
    const fake = makeAtomicFakeRepo({ failRemove: false });
    const { planId, budgetId } = await seed(fake);

    const r = await deleteBudget({ planRepo: fake.repo, clock })({
      budgetPlanId: String(planId),
      budgetId: String(budgetId),
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isOk(r));

    // Usa o metodo atomico novo — nao o save generico + delete separado (fim dos 2 awaits).
    assert.equal(fake.removeCalls(), 1, 'usa removeBudget (metodo atomico)');
    assert.equal(fake.saveCalls(), 0, 'nao usa o save generico do port');

    const plan = await fake.planStore.repo.findById(planId);
    assert.ok(isOk(plan));
    assert.equal(plan.value?.budgets.length, 0, 'budget removido do plano');
    assert.equal(plan.value?.updatedByRef, ACTOR_REF, 'CA6: updatedByRef propagado');
    assert.equal(fake.resultStore.all().length, 0, 'results do budget removidos juntos');
  });

  it('CA1 falha parcial reverte tudo: removeBudget falha -> budget e results permanecem', async () => {
    const clock = ClockFixed(NOW);
    const fake = makeAtomicFakeRepo({ failRemove: true });
    const { planId, budgetId } = await seed(fake);

    const r = await deleteBudget({ planRepo: fake.repo, clock })({
      budgetPlanId: String(planId),
      budgetId: String(budgetId),
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-repo-unavailable');
    assert.equal(fake.removeCalls(), 1, 'tentou o metodo atomico');
    assert.equal(fake.saveCalls(), 0, 'nao caiu no save generico');

    // Rollback conceitual: NADA persistido — sem resultados orfaos, sem budget removido.
    const plan = await fake.planStore.repo.findById(planId);
    assert.ok(isOk(plan));
    assert.equal(plan.value?.budgets.length, 1, 'budget continua no plano');
    assert.equal(String(plan.value?.budgets[0]?.id), String(budgetId));
    assert.equal(fake.resultStore.all().length, 1, 'results continuam');
  });

  it('CA3 nao-regressao: o save generico do plano NAO deleta results (outros use-cases intactos)', async () => {
    const planStore = InMemoryBudgetPlanRepository();
    const resultStore = InMemoryBudgetResultRepository();
    const { planWithBudget, budgetId, result } = build();
    assert.ok(isOk(await planStore.repo.save(planWithBudget, [])));
    assert.ok(isOk(await resultStore.repo.save(result)));

    // Um save generico do plano (ex.: addBudget/createScenery/approve editando o agregado) NAO pode
    // tocar bgp_budget_results — so `removeBudget` apaga resultados. Guard-rail: verde agora e apos W1.
    const money = Money.fromCents(777);
    assert.ok(isOk(money));
    const municipality = PartnerStateRef.rehydrate('SP');
    assert.ok(isOk(municipality));
    const edited = BudgetPlan.addBudget(
      planWithBudget,
      {
        id: BudgetId.generate(),
        partner: { kind: 'state', ref: municipality.value },
        value: money.value,
      },
      NOW,
      ACTOR,
    );
    assert.ok(isOk(edited));
    assert.ok(isOk(await planStore.repo.save(edited.value.plan, [])));

    const list = await resultStore.repo.listByBudgetId(budgetId);
    assert.ok(isOk(list));
    assert.equal(list.value.length, 1, 'save generico preserva os results');
  });

  it('budget inexistente -> budget-not-found (retorna antes de persistir)', async () => {
    const clock = ClockFixed(NOW);
    const planStore = InMemoryBudgetPlanRepository();
    const { planWithBudget } = build();
    assert.ok(isOk(await planStore.repo.save(planWithBudget, [])));

    const r = await deleteBudget({ planRepo: planStore.repo, clock })({
      budgetPlanId: String(planWithBudget.id),
      budgetId: String(BudgetId.generate()),
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-not-found');
  });
});
