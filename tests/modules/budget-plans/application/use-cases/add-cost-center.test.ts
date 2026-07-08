/**
 * BDG-COST-STRUCTURE — W0 (RED) — use case addCostCenter (Fatia 2/US2, CA2/CA3).
 *
 * DEVE FALHAR: application/use-cases/add-cost-center.ts + o writer atômico
 * `CostStructureRepository.mutate` ainda não existem.
 *
 * addCostCenter(deps)(cmd) valida budgetPlanId, gera o CostCenterId e delega ao domínio
 * dentro de `mutate` (leitura de status + escrita atômica). Retorna a árvore atualizada.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import { addCostCenter } from '#src/modules/budget-plans/application/use-cases/add-cost-center.ts';
import {
  makeCostStructureRepo,
  RASCUNHO_PLAN,
  APROVADO_PLAN,
  UNKNOWN_PLAN,
  MALFORMED_PLAN,
} from './_cost-support.ts';

describe('addCostCenter (use case)', () => {
  it('CA2: adiciona cost-center a plano editável -> ok + persiste na árvore', async () => {
    const repo = makeCostStructureRepo();

    const r = await addCostCenter({ costStructureRepo: repo })({
      budgetPlanId: String(RASCUNHO_PLAN),
      name: 'Pessoal',
      direction: 'A PAGAR',
    });

    assert.ok(isOk(r));
    assert.equal(r.value.costCenters.length, 1);
    assert.equal(r.value.costCenters[0]?.name, 'Pessoal');
    assert.equal(r.value.costCenters[0]?.direction, 'A PAGAR');

    // Persistência: uma releitura reflete o nó recém-criado.
    const found = await repo.findByBudgetPlanId(RASCUNHO_PLAN);
    assert.ok(isOk(found));
    assert.equal(found.value.costCenters.length, 1);
  });

  it('CA3: plano APROVADO bloqueia escrita -> budget-plan-not-editable', async () => {
    const r = await addCostCenter({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: String(APROVADO_PLAN),
      name: 'Pessoal',
      direction: 'A PAGAR',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-editable');
  });

  it('plano inexistente -> budget-plan-not-found', async () => {
    const r = await addCostCenter({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: UNKNOWN_PLAN,
      name: 'Pessoal',
      direction: 'A PAGAR',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-found');
  });

  it('nome vazio -> cost-node-name-required', async () => {
    const r = await addCostCenter({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: String(RASCUNHO_PLAN),
      name: '   ',
      direction: 'A PAGAR',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cost-node-name-required');
  });

  it('direção inválida -> cost-node-invalid-direction', async () => {
    const r = await addCostCenter({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: String(RASCUNHO_PLAN),
      name: 'Pessoal',
      direction: 'PARA_O_LADO',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cost-node-invalid-direction');
  });

  it('budgetPlanId malformado -> budget-plan-id-invalid (não toca o repo)', async () => {
    const r = await addCostCenter({ costStructureRepo: makeCostStructureRepo() })({
      budgetPlanId: MALFORMED_PLAN,
      name: 'Pessoal',
      direction: 'A PAGAR',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-id-invalid');
  });
});
