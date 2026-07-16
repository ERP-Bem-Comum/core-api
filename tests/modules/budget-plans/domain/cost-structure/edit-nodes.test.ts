// BGP-COST-STRUCTURE-EDIT (#454 gap 3) — W0 RED — CA1/CA2/CA3/CA4/CA5/CA7.
//
// Renomear e desativar os 3 níveis da árvore. Funções puras sobre CostStructure, como os `add*`.
//
// D2 (decisão do Gabriel, 2026-07-15): desativar um Centro NÃO grava nos filhos — eles ficam
// inativos por HERANÇA, e a leitura entrega o estado efetivo. Cascata na escrita destruiria
// informação: ao reativar o Centro, ou tudo volta (revivendo nós desativados de propósito) ou nada
// volta. O CA4 é o teste que separa as duas semânticas.
//
// D1: não há exclusão de nó — `bgp_budget_results.subcategory_id` não tem FK e apagar deixaria
// lançamento órfão. Só soft.
//
// RED esperado: `rename*`/`setActive*`/`withInheritedActive` ainda não existem.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CostStructure from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import type { CostStructure as Tree } from '#src/modules/budget-plans/domain/cost-structure/types.ts';

const CC = CostCenterId.generate();
const CAT = CategoryId.generate();
const SUB = SubcategoryId.generate();
const CAT2 = CategoryId.generate();

// Árvore 1×1×1 + uma 2ª categoria irmã (para provar que a herança não vaza entre irmãos).
const tree = (): Tree => {
  const s0 = CostStructure.empty(BudgetPlanId.generate());
  const r1 = CostStructure.addCostCenter(
    s0,
    { id: CC, name: 'Operacional', direction: 'A PAGAR' },
    'RASCUNHO',
  );
  assert.ok(r1.ok);
  const r2 = CostStructure.addCategory(
    r1.value,
    { id: CAT, costCenterId: CC, name: 'Pessoal' },
    'RASCUNHO',
  );
  assert.ok(r2.ok);
  const r3 = CostStructure.addSubcategory(
    r2.value,
    { id: SUB, categoryId: CAT, name: 'Salários', launchType: 'DESPESAS_PESSOAIS' },
    'RASCUNHO',
  );
  assert.ok(r3.ok);
  const r4 = CostStructure.addCategory(
    r3.value,
    { id: CAT2, costCenterId: CC, name: 'Viagens' },
    'RASCUNHO',
  );
  assert.ok(r4.ok);
  return r4.value;
};

const findCc = (t: Tree) => t.costCenters.find((c) => c.id === CC);
const findCat = (t: Tree, id = CAT) => findCc(t)?.categories.find((c) => c.id === id);
const findSub = (t: Tree) => findCat(t)?.subcategories.find((s) => s.id === SUB);

describe('CostStructure — nó nasce ativo (#454 gap 3)', () => {
  it('os 3 níveis nascem active=true (nó existente não vira inativo por acidente)', () => {
    const t = tree();
    assert.equal(findCc(t)?.active, true);
    assert.equal(findCat(t)?.active, true);
    assert.equal(findSub(t)?.active, true);
  });
});

describe('CostStructure — renomear (#454 gap 3, CA1/CA7)', () => {
  it('CA1: renomeia o centro e preserva o resto (id, direção, filhos)', () => {
    const t = tree();
    const r = CostStructure.renameCostCenter(t, CC, 'Administrativo', 'RASCUNHO');
    assert.ok(r.ok);
    const cc = findCc(r.value);
    assert.equal(cc?.name, 'Administrativo');
    assert.equal(cc?.direction, 'A PAGAR', 'direção intacta');
    assert.equal(cc?.categories.length, 2, 'filhos intactos');
  });

  it('CA1: renomeia categoria e subcategoria; a folha mantém o launchType', () => {
    const t = tree();
    const r1 = CostStructure.renameCategory(t, CAT, 'Folha', 'RASCUNHO');
    assert.ok(r1.ok);
    assert.equal(findCat(r1.value)?.name, 'Folha');

    const r2 = CostStructure.renameSubcategory(r1.value, SUB, 'Salário base', 'RASCUNHO');
    assert.ok(r2.ok);
    assert.equal(findSub(r2.value)?.name, 'Salário base');
    assert.equal(findSub(r2.value)?.launchType, 'DESPESAS_PESSOAIS', 'launchType intacto');
  });

  it('CA7: nome vazio/whitespace → cost-node-name-required (mesma regra do add)', () => {
    const t = tree();
    const r = CostStructure.renameCostCenter(t, CC, '   ', 'RASCUNHO');
    assert.ok(!r.ok);
    assert.equal(r.error, 'cost-node-name-required');
  });

  // Os 3 níveis, porque cada um tem o seu próprio guard de existência: cobrir só o centro deixaria
  // `patchCategory`/`patchSubcategory` livres para devolver `ok` com a árvore intacta — 200 mudo em
  // vez de 404 — sem nenhum teste cair.
  it('CA6: nó inexistente → cost-node-not-found nos 3 níveis', () => {
    const t = tree();
    const cc = CostStructure.renameCostCenter(t, CostCenterId.generate(), 'X', 'RASCUNHO');
    assert.ok(!cc.ok);
    assert.equal(cc.error, 'cost-node-not-found');

    const cat = CostStructure.renameCategory(t, CategoryId.generate(), 'X', 'RASCUNHO');
    assert.ok(!cat.ok);
    assert.equal(cat.error, 'cost-node-not-found');

    const sub = CostStructure.renameSubcategory(t, SubcategoryId.generate(), 'X', 'RASCUNHO');
    assert.ok(!sub.ok);
    assert.equal(sub.error, 'cost-node-not-found');
  });

  it('CA6: setActive de nó inexistente → cost-node-not-found nos 3 níveis', () => {
    const t = tree();
    const cc = CostStructure.setCostCenterActive(t, CostCenterId.generate(), false, 'RASCUNHO');
    assert.ok(!cc.ok);
    assert.equal(cc.error, 'cost-node-not-found');

    const cat = CostStructure.setCategoryActive(t, CategoryId.generate(), false, 'RASCUNHO');
    assert.ok(!cat.ok);
    assert.equal(cat.error, 'cost-node-not-found');

    const sub = CostStructure.setSubcategoryActive(t, SubcategoryId.generate(), false, 'RASCUNHO');
    assert.ok(!sub.ok);
    assert.equal(sub.error, 'cost-node-not-found');
  });

  it('CA5: plano APROVADO → budget-plan-not-editable (herda o guard dos add*)', () => {
    const t = tree();
    const r = CostStructure.renameCostCenter(t, CC, 'X', 'APROVADO');
    assert.ok(!r.ok);
    assert.equal(r.error, 'budget-plan-not-editable');
  });
});

describe('CostStructure — desativar/reativar (#454 gap 3, CA2/CA5)', () => {
  it('CA2: desativar grava no nó alvo — e o nó CONTINUA na árvore (soft, não some)', () => {
    const t = tree();
    const r = CostStructure.setCostCenterActive(t, CC, false, 'RASCUNHO');
    assert.ok(r.ok);
    assert.equal(findCc(r.value)?.active, false);
    assert.equal(r.value.costCenters.length, 1, 'soft: o nó não sai da árvore');
  });

  it('CA2: desativar e reativar volta ao estado anterior', () => {
    const t = tree();
    const off = CostStructure.setSubcategoryActive(t, SUB, false, 'RASCUNHO');
    assert.ok(off.ok);
    assert.equal(findSub(off.value)?.active, false);
    const on = CostStructure.setSubcategoryActive(off.value, SUB, true, 'RASCUNHO');
    assert.ok(on.ok);
    assert.equal(findSub(on.value)?.active, true);
  });

  // D2: a escrita toca SÓ o alvo. Se algum dia alguém trocar por cascata na escrita, este teste cai.
  it('D2: desativar o Centro NÃO grava active=false nos filhos', () => {
    const t = tree();
    const r = CostStructure.setCostCenterActive(t, CC, false, 'RASCUNHO');
    assert.ok(r.ok);
    assert.equal(findCat(r.value)?.active, true, 'a linha do filho preserva a intenção dele');
    assert.equal(findSub(r.value)?.active, true);
  });

  it('CA5: plano APROVADO → budget-plan-not-editable', () => {
    const t = tree();
    const r = CostStructure.setCategoryActive(t, CAT, false, 'APROVADO');
    assert.ok(!r.ok);
    assert.equal(r.error, 'budget-plan-not-editable');
  });
});

describe('CostStructure.withInheritedActive — estado efetivo (#454 gap 3, CA3/CA4)', () => {
  it('CA3: Centro inativo → filhos vêm inativos, mesmo com active=true na própria linha', () => {
    const t = tree();
    const off = CostStructure.setCostCenterActive(t, CC, false, 'RASCUNHO');
    assert.ok(off.ok);

    const view = CostStructure.withInheritedActive(off.value);
    assert.equal(findCc(view)?.active, false);
    assert.equal(findCat(view)?.active, false, 'categoria inativa por herança');
    assert.equal(findSub(view)?.active, false, 'subcategoria inativa por herança (2 níveis acima)');
  });

  it('CA3: Categoria inativa → só a subcategoria dela cai; a irmã segue ativa', () => {
    const t = tree();
    const off = CostStructure.setCategoryActive(t, CAT, false, 'RASCUNHO');
    assert.ok(off.ok);

    const view = CostStructure.withInheritedActive(off.value);
    assert.equal(findCc(view)?.active, true, 'o pai não cai por causa do filho');
    assert.equal(findSub(view)?.active, false);
    assert.equal(findCat(view, CAT2)?.active, true, 'a irmã não é afetada');
  });

  // CA4 — é isto que a cascata-na-escrita perderia: a intenção individual do nó.
  it('CA4: reativar o Centro devolve cada filho ao que ELE era (o desativado à mão segue inativo)', () => {
    const t = tree();
    const subOff = CostStructure.setSubcategoryActive(t, SUB, false, 'RASCUNHO');
    assert.ok(subOff.ok);
    const ccOff = CostStructure.setCostCenterActive(subOff.value, CC, false, 'RASCUNHO');
    assert.ok(ccOff.ok);
    const ccOn = CostStructure.setCostCenterActive(ccOff.value, CC, true, 'RASCUNHO');
    assert.ok(ccOn.ok);

    const view = CostStructure.withInheritedActive(ccOn.value);
    assert.equal(findCc(view)?.active, true);
    assert.equal(findCat(view)?.active, true, 'a categoria volta — ela nunca foi desativada');
    assert.equal(
      findSub(view)?.active,
      false,
      'a subcategoria continua inativa: foi desativada por si',
    );
  });

  it('árvore toda ativa → withInheritedActive não muda nada', () => {
    const t = tree();
    const view = CostStructure.withInheritedActive(t);
    assert.equal(findCc(view)?.active, true);
    assert.equal(findCat(view)?.active, true);
    assert.equal(findSub(view)?.active, true);
  });

  it('é pura: não altera a árvore recebida', () => {
    const t = tree();
    const off = CostStructure.setCostCenterActive(t, CC, false, 'RASCUNHO');
    assert.ok(off.ok);
    CostStructure.withInheritedActive(off.value);
    assert.equal(findCat(off.value)?.active, true, 'a árvore original preserva a intenção gravada');
  });
});
