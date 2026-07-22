/**
 * BDG-COST-STRUCTURE — W0 (RED) — use case addSubcategory (Fatia 2/US2, CA2/CA3).
 *
 * DEVE FALHAR: application/use-cases/add-subcategory.ts + o writer `mutate` ainda não existem.
 *
 * A folha carrega o launchType (US3). Pai (category) precisa existir — encadeamento
 * addCostCenter -> addCategory -> addSubcategory na MESMA instância de repo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import type { CostStructureRepository } from '#src/modules/budget-plans/domain/cost-structure/repository.ts';
import { addCostCenter } from '#src/modules/budget-plans/application/use-cases/add-cost-center.ts';
import { addCategory } from '#src/modules/budget-plans/application/use-cases/add-category.ts';
import { addSubcategory } from '#src/modules/budget-plans/application/use-cases/add-subcategory.ts';
import {
  makeCostStructureRepo,
  RASCUNHO_PLAN,
  APROVADO_PLAN,
  UNKNOWN_PLAN,
} from './_cost-support.ts';

const UUID_VALIDO = '22222222-2222-4222-8222-222222222222';

// Semeia cost-center + categoria em RASCUNHO_PLAN; devolve o id (string) da categoria.
const seedCategory = async (repo: CostStructureRepository): Promise<string> => {
  const cc = await addCostCenter({ costStructureRepo: repo })({
    budgetPlanId: String(RASCUNHO_PLAN),
    name: 'Pessoal',
    direction: 'A PAGAR',
  });
  assert.ok(isOk(cc));
  const costCenterId = cc.value.costCenters[0]?.id;
  assert.ok(costCenterId !== undefined);

  const cat = await addCategory({ costStructureRepo: repo })({
    budgetPlanId: String(RASCUNHO_PLAN),
    costCenterId: String(costCenterId),
    name: 'Salários',
  });
  assert.ok(isOk(cat));
  const catId = cat.value.costCenters[0]?.categories[0]?.id;
  assert.ok(catId !== undefined);
  return String(catId);
};

describe('addSubcategory (use case)', () => {
  it('CA2: adiciona subcategoria a categoria existente -> ok (com launchType)', async () => {
    const repo = makeCostStructureRepo();
    const categoryId = await seedCategory(repo);

    const r = await addSubcategory({ costStructureRepo: repo })({
      budgetPlanId: String(RASCUNHO_PLAN),
      categoryId,
      name: 'CLT',
      launchType: 'IPCA',
    });

    assert.ok(isOk(r));
    const sub = r.value.costCenters[0]?.categories[0]?.subcategories[0];
    assert.ok(sub !== undefined);
    assert.equal(sub.name, 'CLT');
    assert.equal(sub.launchType, 'IPCA');
  });

  it('CA2 órfão: categoryId inexistente -> cost-node-parent-not-found', async () => {
    const repo = makeCostStructureRepo();
    await seedCategory(repo);

    const r = await addSubcategory({ costStructureRepo: repo })({
      budgetPlanId: String(RASCUNHO_PLAN),
      categoryId: UUID_VALIDO, // válido no formato, ausente da árvore
      name: 'CLT',
      launchType: 'IPCA',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cost-node-parent-not-found');
  });

  it('CA3: plano APROVADO bloqueia -> budget-plan-not-editable', async () => {
    const r = await addSubcategory({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: String(APROVADO_PLAN),
      categoryId: UUID_VALIDO,
      name: 'CLT',
      launchType: 'IPCA',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-editable');
  });

  it('plano inexistente -> budget-plan-not-found', async () => {
    const r = await addSubcategory({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: UNKNOWN_PLAN,
      categoryId: UUID_VALIDO,
      name: 'CLT',
      launchType: 'IPCA',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-found');
  });

  it('launchType inválido -> cost-node-invalid-launch-type', async () => {
    const repo = makeCostStructureRepo();
    const categoryId = await seedCategory(repo);
    const r = await addSubcategory({ costStructureRepo: repo })({
      budgetPlanId: String(RASCUNHO_PLAN),
      categoryId,
      name: 'CLT',
      launchType: 'BITCOIN',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cost-node-invalid-launch-type');
  });

  it('categoryId malformado -> category-id-invalid (não toca o repo)', async () => {
    const r = await addSubcategory({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: String(RASCUNHO_PLAN),
      categoryId: 'nao-e-uuid',
      name: 'CLT',
      launchType: 'IPCA',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'category-id-invalid');
  });
});
