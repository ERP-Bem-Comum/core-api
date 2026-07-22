/**
 * BGP-PLAN-CRUD — W0 (RED) — use case listBudgetPlans (issue #315, CA3).
 *
 * Lista planos raiz com status/programa (nome resolvido via catálogo)/ano/
 * versão formatada/total em centavos, com filtros year/status/programRef.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import { listBudgetPlans } from '#src/modules/budget-plans/application/use-cases/list-budget-plans.ts';
import {
  makeDeps,
  createPlanOrFail,
  NOW,
  ACTOR_REF,
  PROGRAM_ETI_REF,
  PROGRAM_PARC_REF,
  type Deps,
} from './_support.ts';

const baseQuery = { page: 1, limit: 20 } as const;

// Deriva um cenário (filho RASCUNHO nomeado) de um plano-raiz e o persiste direto no repo — o
// suficiente para exercitar a projeção parentId/scenarioName + o filtro rootsOnly (#423), sem depender
// da orquestração completa de clone (coberta em create-scenery.test.ts).
const seedScenery = async (
  deps: Deps,
  root: Awaited<ReturnType<typeof createPlanOrFail>>,
  name: string,
) => {
  const actor = UserRef.rehydrate(ACTOR_REF);
  assert.ok(isOk(actor));
  const scenery = BudgetPlan.createScenery(
    root,
    [],
    { id: BudgetPlanId.generate(), name },
    { now: NOW, actor: actor.value },
  );
  assert.ok(isOk(scenery));
  assert.ok(isOk(await deps.planRepo.save(scenery.value.plan, [])));
  return scenery.value.plan;
};

describe('listBudgetPlans', () => {
  it('CA3: retorna status/programName/ano/versão/totalInCents de cada plano', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    const r = await listBudgetPlans(deps)(baseQuery);
    assert.ok(isOk(r));
    assert.equal(r.value.total, 1);
    const item = r.value.items[0];
    assert.ok(item);
    assert.equal(typeof item.id, 'string');
    assert.equal(item.year, 2026);
    assert.equal(item.status, 'RASCUNHO');
    assert.equal(item.version, '1.0');
    assert.equal(item.programName, 'Ensino em Tempo Integral');
    assert.equal(item.totalInCents, 0);
  });

  it('filtra por year', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    await createPlanOrFail(deps, { year: 2027, programRef: PROGRAM_ETI_REF });

    const r = await listBudgetPlans(deps)({ ...baseQuery, year: 2027 });
    assert.ok(isOk(r));
    assert.equal(r.value.total, 1);
    assert.equal(r.value.items[0]?.year, 2027);
  });

  it('filtra por programRef', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_PARC_REF });

    const r = await listBudgetPlans(deps)({ ...baseQuery, programRef: PROGRAM_PARC_REF });
    assert.ok(isOk(r));
    assert.equal(r.value.total, 1);
    assert.equal(r.value.items[0]?.programName, 'Parceiros');
  });

  it('filtra por status (RASCUNHO cobre todos os recém-criados)', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    const draft = await listBudgetPlans(deps)({ ...baseQuery, status: 'RASCUNHO' });
    assert.ok(isOk(draft));
    assert.equal(draft.value.total, 1);

    const approved = await listBudgetPlans(deps)({ ...baseQuery, status: 'APROVADO' });
    assert.ok(isOk(approved));
    assert.equal(approved.value.total, 0);
  });

  it('lista vazia -> items [] e total 0', async () => {
    const r = await listBudgetPlans(makeDeps())(baseQuery);
    assert.ok(isOk(r));
    assert.deepEqual(r.value.items, []);
    assert.equal(r.value.total, 0);
  });
});

// BGP-LIST-NEST-SCENARIOS — W0 (RED) — issue #423.
// DEVE FALHAR: hoje o item da lista não projeta parentId/scenarioName e o use case ignora rootsOnly
// (o filtro só passa a existir no W1).
describe('listBudgetPlans — aninhar cenários (#423)', () => {
  it('CA2: item traz parentId/scenarioName (raiz null/null; cenário id-do-pai/nome)', async () => {
    const deps = makeDeps();
    const root = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    const scenery = await seedScenery(deps, root, 'Otimista');

    const r = await listBudgetPlans(deps)(baseQuery);
    assert.ok(isOk(r));

    const rootItem = r.value.items.find((i) => i.id === String(root.id));
    assert.ok(rootItem, 'raiz na lista');
    assert.equal(rootItem.parentId, null);
    assert.equal(rootItem.scenarioName, null);

    const scenItem = r.value.items.find((i) => i.id === String(scenery.id));
    assert.ok(scenItem, 'cenário na lista');
    assert.equal(scenItem.parentId, String(root.id));
    assert.equal(scenItem.scenarioName, 'Otimista');
  });

  it('CA3: rootsOnly filtra só planos raiz (parentId null)', async () => {
    const deps = makeDeps();
    const root = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    await seedScenery(deps, root, 'Otimista');

    const todos = await listBudgetPlans(deps)(baseQuery);
    assert.ok(isOk(todos));
    assert.equal(todos.value.total, 2, 'sem filtro: raiz + cenário');

    const raizes = await listBudgetPlans(deps)({ ...baseQuery, rootsOnly: true });
    assert.ok(isOk(raizes));
    assert.equal(raizes.value.total, 1, 'rootsOnly: só a raiz');
    assert.equal(raizes.value.items.length, 1);
    assert.equal(raizes.value.items[0]?.id, String(root.id));
    assert.equal(raizes.value.items[0]?.parentId, null);
  });
});
