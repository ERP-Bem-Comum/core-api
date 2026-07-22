// BDG-CONSOLIDATED-CSV (US5) — W2 — regra pura "vigente por família" (year × programRef).
// A versão APROVADA mais alta de cada família vence (maior major; empate → maior minor).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import type { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { PlanVersion } from '#src/modules/budget-plans/domain/budget-plan/version.ts';
import { selectCurrentApprovedByFamily } from '#src/modules/budget-plans/domain/budget-plan/current-approved.ts';

const NOW = new Date('2026-07-09T12:00:00.000Z');
const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
const PROGRAM_PARC = '22222222-2222-4222-8222-222222222222';
const STATE_CE = 'CE';

const plan = (
  spec: Readonly<{ program: string; version: PlanVersion; cents: number }>,
): BudgetPlan => {
  const programRef = ProgramRef.rehydrate(spec.program);
  assert.ok(isOk(programRef));
  const stateRef = PartnerStateRef.rehydrate(STATE_CE);
  assert.ok(isOk(stateRef));
  const money = Money.fromCents(spec.cents);
  assert.ok(isOk(money));
  return {
    id: BudgetPlanId.generate(),
    year: 2026,
    programRef: programRef.value,
    version: spec.version,
    status: 'APROVADO',
    budgets: [
      {
        id: BudgetId.generate(),
        partner: { kind: 'state', ref: stateRef.value },
      },
    ],
    parentId: null,
    scenarioName: null,
    createdAt: NOW,
    updatedAt: NOW,
    updatedByRef: null,
  };
};

describe('selectCurrentApprovedByFamily', () => {
  it('escolhe a maior versão major da família', () => {
    const v1 = plan({ program: PROGRAM_ETI, version: { major: 1, minor: 0 }, cents: 100 });
    const v2 = plan({ program: PROGRAM_ETI, version: { major: 2, minor: 0 }, cents: 200 });
    const current = selectCurrentApprovedByFamily([v1, v2]);
    assert.equal(current.length, 1);
    assert.equal(current[0]?.version.major, 2);
  });

  it('empata no major → maior minor vence', () => {
    const v10 = plan({ program: PROGRAM_ETI, version: { major: 1, minor: 0 }, cents: 100 });
    const v13 = plan({ program: PROGRAM_ETI, version: { major: 1, minor: 3 }, cents: 130 });
    const current = selectCurrentApprovedByFamily([v10, v13]);
    assert.equal(current.length, 1);
    assert.deepEqual(current[0]?.version, { major: 1, minor: 3 });
  });

  it('uma vigente por família (ETI + PARC → 2)', () => {
    const eti1 = plan({ program: PROGRAM_ETI, version: { major: 1, minor: 0 }, cents: 100 });
    const eti2 = plan({ program: PROGRAM_ETI, version: { major: 2, minor: 0 }, cents: 200 });
    const parc1 = plan({ program: PROGRAM_PARC, version: { major: 1, minor: 0 }, cents: 500 });
    const current = selectCurrentApprovedByFamily([eti1, eti2, parc1]);
    assert.equal(current.length, 2);
    const etiCurrent = current.find((p) => String(p.programRef) === PROGRAM_ETI);
    assert.equal(etiCurrent?.version.major, 2);
  });

  it('entrada vazia → vazio', () => {
    assert.deepEqual(selectCurrentApprovedByFamily([]), []);
  });
});
