// BGP-PLAN-DELETE (#453) — W0 RED — CA1/CA3/CA4/CA7.
//
// `BudgetPlan.remove(plan, children)` — guarda pura de exclusão do plano INTEIRO (≠ removeBudget,
// que tira um orçamento/Rede de dentro dele — #377).
//
// As duas regras são decisão de produto (2026-07-15), não preferência de implementação:
//   D1 APROVADO bloqueia — o módulo trata Aprovado como imutável; o Consolidado ABC (US5) agrega
//      aprovados (apagar reescreve resultado já reportado) e `fin_documents.budget_plan_ref` aponta
//      para planos SEM FK — apagar orfanaria despesa real em silêncio.
//   D2 Com filhos bloqueia — apaga-se de baixo pra cima; nada some por estar aninhado.
//
// Filhos existem nos DOIS ramos, por isso D2 não é consequência de D1: `startCalibration` exige pai
// APROVADO (gera calibração) e `createScenery` exige pai NÃO-aprovado (gera cenário). Logo um
// RASCUNHO pode ter filhos.
//
// RED esperado: `BudgetPlan.remove` ainda não existe.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { ProgramRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const PROGRAM = '11111111-1111-4111-8111-111111111111';

const makePlan = (over: Partial<BudgetPlanEntity>): BudgetPlanEntity => {
  const programRef = ProgramRef.rehydrate(PROGRAM);
  assert.ok(isOk(programRef));
  return {
    id: BudgetPlanId.generate(),
    year: 2026,
    programRef: programRef.value,
    version: { major: 1, minor: 0 },
    status: 'RASCUNHO',
    budgets: [],
    parentId: null,
    scenarioName: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  } as BudgetPlanEntity;
};

describe('BudgetPlan.remove — permitido (#453, CA1/CA7)', () => {
  it('CA1: RASCUNHO sem filhos → ok', () => {
    const r = BudgetPlan.remove(makePlan({ status: 'RASCUNHO' }), []);
    assert.ok(isOk(r));
  });

  // Abandonar uma calibração é legítimo — e libera o guard `budget-plan-calibration-open` do pai,
  // que hoje impede abrir outra enquanto esta existir.
  it('CA7: EM_CALIBRACAO sem filhos → ok', () => {
    const r = BudgetPlan.remove(makePlan({ status: 'EM_CALIBRACAO' }), []);
    assert.ok(isOk(r));
  });

  it('CA1: cenário (folha, scenarioName preenchido) sem filhos → ok', () => {
    const plan = makePlan({ status: 'RASCUNHO', scenarioName: 'Cenário A', parentId: null });
    assert.ok(isOk(BudgetPlan.remove(plan, [])));
  });
});

describe('BudgetPlan.remove — bloqueado (#453, CA3/CA4)', () => {
  it('CA3: APROVADO → budget-plan-already-approved', () => {
    const r = BudgetPlan.remove(makePlan({ status: 'APROVADO' }), []);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-already-approved');
  });

  it('CA4: com filho calibração → budget-plan-has-children', () => {
    const parent = makePlan({ status: 'EM_CALIBRACAO' });
    const child = makePlan({ status: 'EM_CALIBRACAO', parentId: parent.id, scenarioName: null });
    const r = BudgetPlan.remove(parent, [child]);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-has-children');
  });

  // O caso que só existe porque createScenery aceita pai NÃO-aprovado: um RASCUNHO com cenários.
  // Sem este teste, alguém poderia "otimizar" a guarda para checar filhos só quando APROVADO —
  // e o cenário sumiria junto com o pai, sem ninguém ver.
  it('CA4: RASCUNHO com filho cenário → budget-plan-has-children (não escapa por não ser aprovado)', () => {
    const parent = makePlan({ status: 'RASCUNHO' });
    const scenery = makePlan({
      status: 'RASCUNHO',
      parentId: parent.id,
      scenarioName: 'Cenário A',
    });
    const r = BudgetPlan.remove(parent, [scenery]);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-has-children');
  });

  // Ordem determinística: o status é a regra mais forte (imutabilidade do aprovado), então ganha.
  // Trava a mensagem que o usuário vê quando os dois motivos coexistem.
  it('APROVADO E com filhos → already-approved (status decide antes da árvore)', () => {
    const parent = makePlan({ status: 'APROVADO' });
    const child = makePlan({ status: 'EM_CALIBRACAO', parentId: parent.id });
    const r = BudgetPlan.remove(parent, [child]);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-already-approved');
  });

  it('guarda é pura: rejeitar não muda o plano', () => {
    const plan = makePlan({ status: 'APROVADO' });
    BudgetPlan.remove(plan, []);
    assert.equal(plan.status, 'APROVADO');
  });
});
