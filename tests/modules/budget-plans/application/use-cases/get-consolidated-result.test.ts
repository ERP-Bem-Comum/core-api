// BDG-CONSOLIDATED-CSV (US5) — W0 RED — agregação do Consolidado ABC (JSON).
// Paridade legado (ERP-BACKEND consolidatedResult): agrega planos APROVADO por Ano × Programa,
// em centavos. Tradução da árvore US4: consolidamos apenas as RAÍZES aprovadas
// (parentId IS NULL) — é o `version = 1 AND status = APROVADO` do legado sem dupla contagem de
// calibrações/cenários. Sem plano aprovado → resultado vazio coerente (totalCents 0, plans []).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { BudgetPlanRepository } from '#src/modules/budget-plans/domain/budget-plan/repository.ts';
import { getConsolidatedResult } from '#src/modules/budget-plans/application/use-cases/get-consolidated-result.ts';

import { makeDeps, NOW, PROGRAM_ETI_REF, PROGRAM_PARC_REF, STATE_CE_REF } from './_support.ts';

// Ator padrão dos testes (BGP-UPDATED-BY-AUDIT/#373).
const ACTOR = (() => {
  const r = UserRef.rehydrate('00000000-0000-4000-8000-000000000001');
  assert.ok(isOk(r));
  return r.value;
})();

const seedApprovedRoot = async (
  planRepo: BudgetPlanRepository,
  spec: Readonly<{ year: number; programRef: string; valueCents: number }>,
): Promise<BudgetPlanEntity> => {
  const programRef = ProgramRef.rehydrate(spec.programRef);
  assert.ok(isOk(programRef));
  const created = BudgetPlan.create({
    id: BudgetPlanId.generate(),
    year: spec.year,
    programRef: programRef.value,
    now: NOW,
    actor: ACTOR,
  });
  assert.ok(isOk(created));
  const stateRef = PartnerStateRef.rehydrate(STATE_CE_REF);
  assert.ok(isOk(stateRef));
  const money = Money.fromCents(spec.valueCents);
  assert.ok(isOk(money));
  const withBudget = BudgetPlan.addBudget(
    created.value.plan,
    {
      id: BudgetId.generate(),
      partner: { kind: 'state', ref: stateRef.value },
    },
    NOW,
    ACTOR,
  );
  assert.ok(isOk(withBudget));
  const approved = BudgetPlan.approve(withBudget.value.plan, NOW, ACTOR);
  assert.ok(isOk(approved));
  const saved = await planRepo.save(approved.value.plan, []);
  assert.ok(isOk(saved));
  return approved.value.plan;
};

describe('getConsolidatedResult — agrega raízes aprovadas por Ano × Programa', () => {
  it('CA1: soma totalCents das raízes aprovadas do ano; 1 summary por plano', async () => {
    const deps = makeDeps();
    await seedApprovedRoot(deps.planRepo, {
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      valueCents: 100_000,
    });
    await seedApprovedRoot(deps.planRepo, {
      year: 2026,
      programRef: PROGRAM_PARC_REF,
      valueCents: 250_000,
    });

    const r = await getConsolidatedResult(deps)({ year: 2026 });
    assert.ok(isOk(r));
    assert.equal(r.value.year, 2026);
    // #458: totalCents agora derivado dos lançamentos (bgp_budget_results); sem results semeados → 0.
    // Coberto em plan-total.test.ts e budget-total-derived.routes.test.ts.
    assert.equal(r.value.totalCents, 0);
    assert.equal(r.value.plans.length, 2);
    const eti = r.value.plans.find((p) => p.programAbbreviation === 'ETI');
    assert.ok(eti !== undefined);
    assert.equal(eti.programName, 'Ensino em Tempo Integral');
    assert.equal(eti.totalCents, 0);
    assert.equal(eti.version, 1);
  });

  it('exclui planos de outro ano', async () => {
    const deps = makeDeps();
    await seedApprovedRoot(deps.planRepo, {
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      valueCents: 100_000,
    });
    await seedApprovedRoot(deps.planRepo, {
      year: 2027,
      programRef: PROGRAM_ETI_REF,
      valueCents: 999_000,
    });

    const r = await getConsolidatedResult(deps)({ year: 2026 });
    assert.ok(isOk(r));
    // #458: total derivado dos lançamentos; sem results semeados → 0. O que este caso trava é o
    // recorte por ano (só o plano de 2026 entra), não o valor monetário.
    assert.equal(r.value.totalCents, 0);
    assert.equal(r.value.plans.length, 1);
  });

  it('exclui plano não-aprovado (RASCUNHO)', async () => {
    const deps = makeDeps();
    const programRef = ProgramRef.rehydrate(PROGRAM_ETI_REF);
    assert.ok(isOk(programRef));
    const rascunho = BudgetPlan.create({
      id: BudgetPlanId.generate(),
      year: 2026,
      programRef: programRef.value,
      now: NOW,
      actor: ACTOR,
    });
    assert.ok(isOk(rascunho));
    await deps.planRepo.save(rascunho.value.plan, []); // fica RASCUNHO

    const r = await getConsolidatedResult(deps)({ year: 2026 });
    assert.ok(isOk(r));
    assert.equal(r.value.totalCents, 0);
    assert.equal(r.value.plans.length, 0);
  });

  it('seleciona o filho VIGENTE (maior versão aprovada da família), não a raiz histórica', async () => {
    const deps = makeDeps();
    const root = await seedApprovedRoot(deps.planRepo, {
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      valueCents: 100_000,
    });
    // Filho aprovado da mesma família (calibração promovida, US4). Ambos ficam APROVADO; o vigente é
    // o de MAIOR versão (v2.0) — o consolidado mostra o filho, NÃO a raiz histórica.
    const child: BudgetPlanEntity = {
      ...root,
      id: BudgetPlanId.generate(),
      parentId: root.id,
      version: { major: 2, minor: 0 },
      status: 'APROVADO',
      budgets: root.budgets,
    };
    await deps.planRepo.save(child, []);

    const r = await getConsolidatedResult(deps)({ year: 2026 });
    assert.ok(isOk(r));
    // #458: total derivado dos lançamentos; sem results semeados → 0. O discriminador deste caso é a
    // seleção do filho vigente (version 2, id do filho), não o valor.
    assert.equal(r.value.totalCents, 0);
    assert.equal(r.value.plans.length, 1);
    assert.equal(r.value.plans[0]?.version, 2);
    assert.equal(r.value.plans[0]?.totalCents, 0);
    assert.equal(r.value.plans[0]?.id, String(child.id));
  });

  it('filtro por programa estreita o consolidado', async () => {
    const deps = makeDeps();
    await seedApprovedRoot(deps.planRepo, {
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      valueCents: 100_000,
    });
    await seedApprovedRoot(deps.planRepo, {
      year: 2026,
      programRef: PROGRAM_PARC_REF,
      valueCents: 250_000,
    });

    const r = await getConsolidatedResult(deps)({ year: 2026, programRef: PROGRAM_ETI_REF });
    assert.ok(isOk(r));
    // #458: total derivado dos lançamentos; sem results semeados → 0. Este caso trava o filtro por
    // programa (só ETI entra), não o valor monetário.
    assert.equal(r.value.totalCents, 0);
    assert.equal(r.value.plans.length, 1);
    assert.equal(r.value.plans[0]?.programAbbreviation, 'ETI');
  });

  it('sem plano aprovado → vazio coerente (totalCents 0, plans [])', async () => {
    const deps = makeDeps();
    const r = await getConsolidatedResult(deps)({ year: 2030 });
    assert.ok(isOk(r));
    assert.equal(r.value.totalCents, 0);
    assert.deepEqual(r.value.plans, []);
  });
});
