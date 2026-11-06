// Achado 7 — `importFromYear === year` só é recusado depois de idas ao repositório.
// Ocorrência = algum método do planRepo foi chamado antes da resposta `budget-plan-import-same-year`.
import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import type { BudgetPlanRepository } from '#src/modules/budget-plans/domain/budget-plan/repository.ts';
import { memoryRepos, useCases, measure, ACTOR_REF, PROGRAM_ETI } from './_world.ts';

describe('F7 — recusa por mesmo ano sem tocar o banco', () => {
  it('mesmo ano é recusado antes de qualquer consulta', async () => {
    let totalCalls = 0;
    const m = await measure(
      'F7',
      'consultas ao planRepo antes do 422 de mesmo ano',
      async () => {
        const base = memoryRepos();
        let calls = 0;
        const spied = Object.fromEntries(
          Object.entries(base.planRepo).map(([k, fn]) => [
            k,
            (...args: unknown[]) => {
              calls += 1;
              return (fn as (...a: unknown[]) => unknown)(...args);
            },
          ]),
        ) as BudgetPlanRepository;
        const uc = useCases({ ...base, planRepo: spied });
        const year = 2000 + Math.floor(Math.random() * 101);
        const r = await uc.createBudgetPlan({
          year,
          programRef: PROGRAM_ETI,
          importFromYear: year,
          updatedByRef: ACTOR_REF,
        });
        assert.ok(!r.ok && r.error === 'budget-plan-import-same-year');
        totalCalls += calls;
        return calls > 0;
      },
      () => ({ totalRepoCalls: totalCalls }),
    );
    assert.equal(m.occurred, 0, `consultou o banco em ${m.occurred}/${m.runs}`);
  });
});
