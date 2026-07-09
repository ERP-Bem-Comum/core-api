// BDG-PLAN-LIFECYCLE (US4) — W1-A RED. State machine do plano: derivação de filhos (calibração/cenário)
// + aprovação. Funções puras sobre BudgetPlan; guards por status + scenarioName (fiéis ao legado
// budget-plans.service.ts). Versionamento: calibração = major+1; cenário = minor+1 (comentário version.ts).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { ProgramRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';

const NOW = new Date('2026-07-09T12:00:00.000Z');
const PROGRAM = '11111111-1111-4111-8111-111111111111';

const makePlan = (over: Partial<BudgetPlanEntity>): BudgetPlanEntity => {
  const programRef = ProgramRef.rehydrate(PROGRAM);
  assert.ok(isOk(programRef));
  return {
    id: BudgetPlanId.generate(),
    year: 2026,
    programRef: programRef.value,
    version: { major: 3, minor: 0 },
    status: 'APROVADO',
    budgets: [],
    parentId: null,
    scenarioName: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  } as BudgetPlanEntity;
};

describe('BudgetPlan.startCalibration (US4/CA1)', () => {
  it('APROVADO → filho EM_CALIBRACAO, version major+1, parentId = pai, aprovado intacto', () => {
    const parent = makePlan({ status: 'APROVADO', version: { major: 3, minor: 0 } });
    const r = BudgetPlan.startCalibration(parent, BudgetPlanId.generate(), NOW);
    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'EM_CALIBRACAO');
    assert.equal(r.value.plan.version.major, 4);
    assert.equal(r.value.plan.version.minor, 0);
    assert.equal(String(r.value.plan.parentId), String(parent.id));
    assert.equal(r.value.plan.scenarioName, null);
    assert.equal(parent.status, 'APROVADO'); // pai imutável
  });

  it('plano não-APROVADO → budget-plan-not-approved', () => {
    const r = BudgetPlan.startCalibration(
      makePlan({ status: 'RASCUNHO' }),
      BudgetPlanId.generate(),
      NOW,
    );
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-not-approved');
  });

  it('cenário não inicia calibração → budget-plan-is-scenario', () => {
    const parent = makePlan({ status: 'APROVADO', scenarioName: 'Cenário A' });
    const r = BudgetPlan.startCalibration(parent, BudgetPlanId.generate(), NOW);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-is-scenario');
  });
});

describe('BudgetPlan.createScenery (US4/CA4)', () => {
  it('não-APROVADO → filho RASCUNHO, version minor+1, scenarioName preenchido', () => {
    const parent = makePlan({ status: 'EM_CALIBRACAO', version: { major: 4, minor: 0 } });
    const r = BudgetPlan.createScenery(parent, BudgetPlanId.generate(), 'Otimista', NOW);
    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'RASCUNHO');
    assert.equal(r.value.plan.version.major, 4);
    assert.equal(r.value.plan.version.minor, 1);
    assert.equal(r.value.plan.scenarioName, 'Otimista');
    assert.equal(String(r.value.plan.parentId), String(parent.id));
  });

  it('APROVADO não gera cenário → budget-plan-already-approved', () => {
    const r = BudgetPlan.createScenery(
      makePlan({ status: 'APROVADO' }),
      BudgetPlanId.generate(),
      'X',
      NOW,
    );
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-already-approved');
  });
});

describe('BudgetPlan.approve (US4/CA2)', () => {
  it('EM_CALIBRACAO → APROVADO', () => {
    const r = BudgetPlan.approve(makePlan({ status: 'EM_CALIBRACAO' }), NOW);
    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'APROVADO');
  });

  it('já APROVADO → budget-plan-already-approved', () => {
    const r = BudgetPlan.approve(makePlan({ status: 'APROVADO' }), NOW);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-already-approved');
  });
});
