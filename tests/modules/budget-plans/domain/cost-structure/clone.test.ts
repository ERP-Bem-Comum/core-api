// BDG-PLAN-LIFECYCLE (US4) — W1-C RED. Clonagem profunda da árvore de custos pai→filho (calibração/
// cenário). Função pura: id-factory injetado (pureza), devolve a nova árvore + mapa oldSubcat→newSubcat
// (o legado casa subcategoria por NOME ao clonar; aqui casamos por id via o mapa — mais robusto).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as CostStructure from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';

const buildSource = () => {
  const sourcePlanId = BudgetPlanId.generate();
  const ccId = CostCenterId.generate();
  const catId = CategoryId.generate();
  const subA = SubcategoryId.generate();
  const subB = SubcategoryId.generate();

  let s = CostStructure.empty(sourcePlanId);
  const r1 = CostStructure.addCostCenter(
    s,
    { id: ccId, name: 'Pessoal', direction: 'A PAGAR' },
    'RASCUNHO',
  );
  assert.ok(isOk(r1));
  s = r1.value;
  const r2 = CostStructure.addCategory(
    s,
    { id: catId, costCenterId: ccId, name: 'Salários' },
    'RASCUNHO',
  );
  assert.ok(isOk(r2));
  s = r2.value;
  const r3 = CostStructure.addSubcategory(
    s,
    { id: subA, categoryId: catId, name: 'CLT', launchType: 'IPCA' },
    'RASCUNHO',
  );
  assert.ok(isOk(r3));
  s = r3.value;
  const r4 = CostStructure.addSubcategory(
    s,
    { id: subB, categoryId: catId, name: 'PJ', launchType: 'CAED' },
    'RASCUNHO',
  );
  assert.ok(isOk(r4));
  s = r4.value;
  return { structure: s, subA, subB };
};

describe('CostStructure.clone — clonagem profunda pai→filho (US4/W1-C)', () => {
  it('replica a árvore com novos ids, preservando nomes/direção/launchType', () => {
    const { structure: source } = buildSource();
    const targetPlanId = BudgetPlanId.generate();
    const cloned = CostStructure.clone(source, targetPlanId, {
      costCenter: () => CostCenterId.generate(),
      category: () => CategoryId.generate(),
      subcategory: () => SubcategoryId.generate(),
    });

    assert.equal(String(cloned.structure.budgetPlanId), String(targetPlanId));
    assert.equal(cloned.structure.costCenters.length, 1);
    const cc = cloned.structure.costCenters[0];
    assert.equal(cc?.name, 'Pessoal');
    assert.equal(cc?.direction, 'A PAGAR');
    assert.notEqual(String(cc?.id), String(source.costCenters[0]?.id)); // id novo
    const cat = cc?.categories[0];
    assert.equal(cat?.name, 'Salários');
    assert.equal(cat?.subcategories.length, 2);
    assert.equal(cat?.subcategories[0]?.name, 'CLT');
    assert.equal(cat?.subcategories[0]?.launchType, 'IPCA');
    assert.equal(cat?.subcategories[1]?.launchType, 'CAED');
  });

  it('devolve mapa oldSubcatId→newSubcatId apontando para as folhas clonadas', () => {
    const { structure: source, subA, subB } = buildSource();
    const targetPlanId = BudgetPlanId.generate();
    const cloned = CostStructure.clone(source, targetPlanId, {
      costCenter: () => CostCenterId.generate(),
      category: () => CategoryId.generate(),
      subcategory: () => SubcategoryId.generate(),
    });

    assert.equal(cloned.subcategoryIdMap.size, 2);
    const newA = cloned.subcategoryIdMap.get(String(subA));
    const newB = cloned.subcategoryIdMap.get(String(subB));
    assert.ok(newA !== undefined && newB !== undefined);
    const leaves = cloned.structure.costCenters[0]?.categories[0]?.subcategories ?? [];
    assert.equal(String(leaves[0]?.id), String(newA));
    assert.equal(String(leaves[1]?.id), String(newB));
    // ids realmente novos
    assert.notEqual(String(newA), String(subA));
  });
});
