/**
 * BGP-INSIGHTS-REALIZED — W0 (RED) — use case getBudgetPlanInsights (#416).
 *
 * O insights passa a projetar o **Realizado** (Σ conciliado por plano, via reader do financial
 * injetado como port/ACL) além do Planejado, e o `networksCount` (= plan.budgets.length):
 *   - `realizedInCents` em `current` e em cada `previousYears` (correlação plano↔ref por id do plano);
 *   - `networksCount` no topo da resposta;
 *   - Planejado (`totalInCents`) INALTERADO (aditivo — CA4).
 *
 * DEVE FALHAR: hoje o use case só devolve `{ current, previousYears }` com `{ year, totalInCents }`,
 * sem `realizedInCents` nem `networksCount`. Usa um **fake** do reader (não mock): objeto que cumpre
 * o contrato `getByPlans(refs) -> Result<ReadonlyMap<string, number>, E>`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import {
  PartnerStateRef,
  PartnerMunicipalityRef,
} from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import { getBudgetPlanInsights } from '#src/modules/budget-plans/application/use-cases/get-budget-plan-insights.ts';
import {
  makeDeps,
  createPlanOrFail,
  NOW,
  PROGRAM_ETI_REF,
  ACTOR_REF,
  STATE_CE_REF,
  MUN_FORTALEZA_REF,
} from './_support.ts';

const ACTOR = (() => {
  const r = UserRef.rehydrate(ACTOR_REF);
  assert.ok(isOk(r));
  return r.value;
})();

const cents = (raw: number) => {
  const r = Money.fromCents(raw);
  assert.ok(isOk(r));
  return r.value;
};

// Fake do RealizedByPlanReader (port/ACL): devolve o realizado por ref a partir de um mapa fixo.
// Refs ausentes do mapa não entram → o use case deve tratá-los como 0.
const fakeRealizedReader = (byRef: Readonly<Record<string, number>>) => ({
  getByPlans: (_refs: readonly string[]) =>
    Promise.resolve(ok(new Map<string, number>(Object.entries(byRef)))),
});

describe('getBudgetPlanInsights — Realizado + networksCount (#416)', () => {
  it('CA1/CA3/CA4: realizedInCents em current e previousYears; networksCount = budgets; Planejado inalterado', async () => {
    const deps = makeDeps();

    // Plano atual (2026) com 2 orçamentos por Rede (CE + Fortaleza) → networksCount 2, Planejado 80_000.
    const current = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    const stateRef = PartnerStateRef.rehydrate(STATE_CE_REF);
    assert.ok(isOk(stateRef));
    const munRef = PartnerMunicipalityRef.rehydrate(MUN_FORTALEZA_REF);
    assert.ok(isOk(munRef));
    const b1 = BudgetPlan.addBudget(
      current,
      {
        id: BudgetId.generate(),
        partner: { kind: 'state', ref: stateRef.value },
        value: cents(50_000),
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
        value: cents(30_000),
      },
      NOW,
      ACTOR,
    );
    assert.ok(isOk(b2));
    assert.ok(isOk(await deps.planRepo.save(b2.value.plan, [])));

    // Anos anteriores (raízes do MESMO programa): 2025 com Realizado; 2024 sem conciliação → 0.
    const prev2025 = await createPlanOrFail(deps, { year: 2025, programRef: PROGRAM_ETI_REF });
    const prev2024 = await createPlanOrFail(deps, { year: 2024, programRef: PROGRAM_ETI_REF });

    const realizedReader = fakeRealizedReader({
      [String(current.id)]: 60_000,
      [String(prev2025.id)]: 40_000,
      // prev2024 ausente → 0
    });

    const r = await getBudgetPlanInsights({ planRepo: deps.planRepo, realizedReader })(
      String(current.id),
    );
    assert.ok(isOk(r), JSON.stringify(r));

    // networksCount = número de Redes do plano atual.
    assert.equal(r.value.networksCount, 2);

    // current: Planejado inalterado + Realizado projetado.
    assert.equal(r.value.current.year, 2026);
    assert.equal(r.value.current.totalInCents, 80_000, 'Planejado inalterado (aditivo)');
    assert.equal(r.value.current.realizedInCents, 60_000);

    // previousYears: mais recente primeiro; Realizado por ref, 0 quando ausente.
    assert.equal(r.value.previousYears.length, 2);
    const y2025 = r.value.previousYears.find((y) => y.year === 2025);
    const y2024 = r.value.previousYears.find((y) => y.year === 2024);
    assert.ok(y2025 && y2024);
    assert.equal(y2025.realizedInCents, 40_000);
    assert.equal(y2024.realizedInCents, 0, 'ref sem conciliação → 0');
    assert.equal(prev2024.year, 2024); // guarda de sanidade do fixture
  });

  it('CA1: plano sem conciliados → realizedInCents 0; sem Redes → networksCount 0', async () => {
    const deps = makeDeps();
    const plan = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    const realizedReader = fakeRealizedReader({}); // nada conciliado

    const r = await getBudgetPlanInsights({ planRepo: deps.planRepo, realizedReader })(
      String(plan.id),
    );
    assert.ok(isOk(r), JSON.stringify(r));
    assert.equal(r.value.networksCount, 0, 'plano sem Redes → 0');
    assert.equal(r.value.current.realizedInCents, 0);
  });

  it('fail-closed: reader do financial indisponível → propaga erro (não serve Realizado parcial)', async () => {
    const deps = makeDeps();
    const plan = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    // Reader que falha (ex.: financial fora do ar). O insights NÃO pode devolver Planejado com
    // Realizado silenciosamente zerado — deve propagar o erro (plugin mapeia → 503).
    const realizedReader = {
      getByPlans: (_refs: readonly string[]) =>
        Promise.resolve(err('realized-by-plan-read-unavailable' as const)),
    };

    const r = await getBudgetPlanInsights({ planRepo: deps.planRepo, realizedReader })(
      String(plan.id),
    );
    assert.equal(isOk(r), false, 'não pode devolver ok com Realizado zerado');
    if (isOk(r)) return;
    assert.equal(r.error, 'realized-by-plan-read-unavailable');
  });
});
