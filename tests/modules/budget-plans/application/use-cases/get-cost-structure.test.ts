/**
 * BDG-COST-STRUCTURE — W0 (RED) — use case getCostStructure (Fatia 2/US2, CA1).
 *
 * DEVE FALHAR: application/use-cases/get-cost-structure.ts ainda não existe.
 *
 * getCostStructure(deps)(rawId): valida id -> confere existência do plano (planRepo) ->
 * reconstrói a árvore (costStructureRepo). Plano sem nós devolve árvore VAZIA (não erro).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import {
  empty,
  addCostCenter,
  addCategory,
  addSubcategory,
} from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import { InMemoryCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.in-memory.ts';
import { getCostStructure } from '#src/modules/budget-plans/application/use-cases/get-cost-structure.ts';
import { makeDeps, createPlanOrFail, PROGRAM_ETI_REF } from './_support.ts';

const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

describe('getCostStructure (use case)', () => {
  it('CA1: plano existente sem nós -> árvore vazia (ok, costCenters [])', async () => {
    const deps = makeDeps();
    const plan = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    const costStructureRepo = InMemoryCostStructureRepository().repo;

    const r = await getCostStructure({ costStructureRepo, planRepo: deps.planRepo })(
      String(plan.id),
    );

    assert.ok(isOk(r));
    assert.equal(String(r.value.budgetPlanId), String(plan.id));
    assert.deepEqual(r.value.costCenters, []);
  });

  it('CA1: plano com árvore de 3 níveis -> devolve a árvore reconstruída', async () => {
    const deps = makeDeps();
    const plan = await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    const costStructureRepo = InMemoryCostStructureRepository().repo;

    // Semeia uma árvore pelas ops puras do domínio (plano RASCUNHO é editável).
    let s = empty(plan.id);
    const ccId = CostCenterId.generate();
    const r1 = addCostCenter(s, { id: ccId, name: 'Pessoal', direction: 'A PAGAR' }, 'RASCUNHO');
    assert.ok(isOk(r1));
    s = r1.value;
    const catId = CategoryId.generate();
    const r2 = addCategory(s, { id: catId, costCenterId: ccId, name: 'Salários' }, 'RASCUNHO');
    assert.ok(isOk(r2));
    s = r2.value;
    const r3 = addSubcategory(
      s,
      { id: SubcategoryId.generate(), categoryId: catId, name: 'CLT', launchType: 'IPCA' },
      'RASCUNHO',
    );
    assert.ok(isOk(r3));
    s = r3.value;
    assert.ok(isOk(await costStructureRepo.save(s)));

    const r = await getCostStructure({ costStructureRepo, planRepo: deps.planRepo })(
      String(plan.id),
    );

    assert.ok(isOk(r));
    assert.equal(r.value.costCenters.length, 1);
    const cc = r.value.costCenters[0];
    assert.ok(cc !== undefined);
    assert.equal(cc.name, 'Pessoal');
    assert.equal(cc.categories.length, 1);
    assert.equal(cc.categories[0]?.subcategories[0]?.launchType, 'IPCA');
  });

  it('plano inexistente -> budget-plan-not-found', async () => {
    const deps = makeDeps();
    const r = await getCostStructure({
      costStructureRepo: InMemoryCostStructureRepository().repo,
      planRepo: deps.planRepo,
    })(UUID_INEXISTENTE);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-found');
  });

  it('id malformado -> budget-plan-id-invalid', async () => {
    const deps = makeDeps();
    const r = await getCostStructure({
      costStructureRepo: InMemoryCostStructureRepository().repo,
      planRepo: deps.planRepo,
    })('nao-e-uuid');
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-id-invalid');
  });
});
