// BDG-COST-STRUCTURE (#316) — W0 RED. Agregado da árvore de custos: montar/editar + editabilidade por status.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CostStructure from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';

describe('CostStructure — árvore CostCenter→Category→Subcategory (#316)', () => {
  it('CA1: monta os 3 níveis e lê a árvore (direction na raiz, launchType na folha)', () => {
    const s0 = CostStructure.empty(BudgetPlanId.generate());
    const ccId = CostCenterId.generate();
    const catId = CategoryId.generate();
    const subId = SubcategoryId.generate();

    const r1 = CostStructure.addCostCenter(
      s0,
      { id: ccId, name: 'Operacional', direction: 'A PAGAR' },
      'RASCUNHO',
    );
    assert.equal(r1.ok, true);
    if (!r1.ok) return;
    const r2 = CostStructure.addCategory(
      r1.value,
      { id: catId, costCenterId: ccId, name: 'Pessoal' },
      'RASCUNHO',
    );
    assert.equal(r2.ok, true);
    if (!r2.ok) return;
    const r3 = CostStructure.addSubcategory(
      r2.value,
      { id: subId, categoryId: catId, name: 'Salários', launchType: 'DESPESAS_PESSOAIS' },
      'RASCUNHO',
    );
    assert.equal(r3.ok, true);
    if (!r3.ok) return;

    const tree = r3.value;
    assert.equal(tree.costCenters.length, 1);
    assert.equal(tree.costCenters[0]?.direction, 'A PAGAR');
    assert.equal(tree.costCenters[0]?.categories[0]?.name, 'Pessoal');
    assert.equal(
      tree.costCenters[0]?.categories[0]?.subcategories[0]?.launchType,
      'DESPESAS_PESSOAIS',
    );
  });

  it('CA2: EM_CALIBRACAO também é editável', () => {
    const s0 = CostStructure.empty(BudgetPlanId.generate());
    const r = CostStructure.addCostCenter(
      s0,
      { id: CostCenterId.generate(), name: 'Rede', direction: 'A RECEBER' },
      'EM_CALIBRACAO',
    );
    assert.equal(r.ok, true);
  });

  it('CA2: nome vazio → cost-node-name-required', () => {
    const s0 = CostStructure.empty(BudgetPlanId.generate());
    const r = CostStructure.addCostCenter(
      s0,
      { id: CostCenterId.generate(), name: '  ', direction: 'A PAGAR' },
      'RASCUNHO',
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cost-node-name-required');
  });

  it('CA2: categoria em cost-center inexistente → cost-node-parent-not-found', () => {
    const s0 = CostStructure.empty(BudgetPlanId.generate());
    const r = CostStructure.addCategory(
      s0,
      { id: CategoryId.generate(), costCenterId: CostCenterId.generate(), name: 'Órfã' },
      'RASCUNHO',
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cost-node-parent-not-found');
  });

  it('CA2: direction inválida → cost-node-invalid-direction', () => {
    const s0 = CostStructure.empty(BudgetPlanId.generate());
    const r = CostStructure.addCostCenter(
      s0,
      { id: CostCenterId.generate(), name: 'X', direction: 'PAGAR' },
      'RASCUNHO',
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cost-node-invalid-direction');
  });

  it('CA3: escrita com plano APROVADO → budget-plan-not-editable', () => {
    const s0 = CostStructure.empty(BudgetPlanId.generate());
    const r = CostStructure.addCostCenter(
      s0,
      { id: CostCenterId.generate(), name: 'X', direction: 'A PAGAR' },
      'APROVADO',
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'budget-plan-not-editable');
  });
});
