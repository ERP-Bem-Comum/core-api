/**
 * BDG-COST-STRUCTURE — W0 (RED) — use case addCategory (Fatia 2/US2, CA2/CA3).
 *
 * DEVE FALHAR: application/use-cases/add-category.ts + o writer `mutate` ainda não existem.
 *
 * addCategory delega ao domínio dentro de `mutate`; o pai (cost-center) precisa existir na
 * árvore — daí o encadeamento addCostCenter -> addCategory na MESMA instância de repo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import type { CostStructureRepository } from '#src/modules/budget-plans/domain/cost-structure/repository.ts';
import { addCostCenter } from '#src/modules/budget-plans/application/use-cases/add-cost-center.ts';
import { addCategory } from '#src/modules/budget-plans/application/use-cases/add-category.ts';
import {
  makeCostStructureRepo,
  RASCUNHO_PLAN,
  APROVADO_PLAN,
  UNKNOWN_PLAN,
} from './_cost-support.ts';

const UUID_VALIDO = '11111111-1111-4111-8111-111111111111';

// Semeia um cost-center em RASCUNHO_PLAN e devolve seu id (string) para pendurar categorias.
const seedCostCenter = async (repo: CostStructureRepository): Promise<string> => {
  const r = await addCostCenter({ costStructureRepo: repo })({
    budgetPlanId: String(RASCUNHO_PLAN),
    name: 'Pessoal',
    direction: 'A PAGAR',
  });
  assert.ok(isOk(r), `seed addCostCenter falhou: ${JSON.stringify(r)}`);
  const id = r.value.costCenters[0]?.id;
  assert.ok(id !== undefined);
  return String(id);
};

describe('addCategory (use case)', () => {
  it('CA2: adiciona categoria a cost-center existente -> ok', async () => {
    const repo = makeCostStructureRepo();
    const costCenterId = await seedCostCenter(repo);

    const r = await addCategory({ costStructureRepo: repo })({
      budgetPlanId: String(RASCUNHO_PLAN),
      costCenterId,
      name: 'Salários',
    });

    assert.ok(isOk(r));
    const cc = r.value.costCenters.find((c) => String(c.id) === costCenterId);
    assert.ok(cc !== undefined);
    assert.equal(cc.categories.length, 1);
    assert.equal(cc.categories[0]?.name, 'Salários');
  });

  it('CA2 órfão: costCenterId inexistente -> cost-node-parent-not-found', async () => {
    const repo = makeCostStructureRepo();
    await seedCostCenter(repo);

    const r = await addCategory({ costStructureRepo: repo })({
      budgetPlanId: String(RASCUNHO_PLAN),
      costCenterId: UUID_VALIDO, // válido no formato, ausente da árvore
      name: 'Salários',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cost-node-parent-not-found');
  });

  it('CA3: plano APROVADO bloqueia -> budget-plan-not-editable', async () => {
    const r = await addCategory({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: String(APROVADO_PLAN),
      costCenterId: UUID_VALIDO,
      name: 'Salários',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-editable');
  });

  it('plano inexistente -> budget-plan-not-found', async () => {
    const r = await addCategory({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: UNKNOWN_PLAN,
      costCenterId: UUID_VALIDO,
      name: 'Salários',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-found');
  });

  it('nome vazio -> cost-node-name-required', async () => {
    const repo = makeCostStructureRepo();
    const costCenterId = await seedCostCenter(repo);
    const r = await addCategory({ costStructureRepo: repo })({
      budgetPlanId: String(RASCUNHO_PLAN),
      costCenterId,
      name: '  ',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cost-node-name-required');
  });

  it('costCenterId malformado -> cost-center-id-invalid (não toca o repo)', async () => {
    const r = await addCategory({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: String(RASCUNHO_PLAN),
      costCenterId: 'nao-e-uuid',
      name: 'Salários',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cost-center-id-invalid');
  });
});
