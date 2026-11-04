// Achado 9 — a cópia lê os lançamentos com uma consulta por rede (N+1).
// Cada execução calibra um plano aprovado com 1 a 27 redes sorteadas. Ocorrência = mais de uma
// leitura de lançamentos para copiar um plano.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { BudgetResultRepository } from '#src/modules/budget-plans/domain/budget-result/repository.ts';
import { memoryRepos, useCases, seedPlan, measure, ACTOR_REF, PROGRAM_ETI } from './_world.ts';

describe('F9 — leitura dos lançamentos da origem em lote', () => {
  it('copiar um plano lê os lançamentos numa consulta só', async () => {
    let budgetsTotal = 0;
    let readsTotal = 0;
    const m = await measure(
      'F9',
      'listByBudgetId chamado mais de uma vez por cópia',
      async () => {
        const base = memoryRepos();
        let reads = 0;
        const budgetResultRepo: BudgetResultRepository = {
          ...base.budgetResultRepo,
          // Conta QUALQUER leitura de lançamentos, unitária ou em lote.
          listByBudgetId: async (id) => {
            reads += 1;
            return base.budgetResultRepo.listByBudgetId(id);
          },
          listByBudgetIds: async (ids) => {
            reads += 1;
            return base.budgetResultRepo.listByBudgetIds(ids);
          },
        };
        const uc = useCases({ ...base, budgetResultRepo });
        const budgets = 1 + Math.floor(Math.random() * 27);
        const plan = await seedPlan(uc, {
          year: 2026,
          programRef: PROGRAM_ETI,
          budgets,
          subcategories: 1,
          months: 1,
          approve: true,
        });
        reads = 0;
        const cal = await uc.startCalibration({
          parentPlanId: plan.planId,
          updatedByRef: ACTOR_REF,
        });
        assert.ok(cal.ok);
        budgetsTotal += budgets;
        readsTotal += reads;
        return reads > 1;
      },
      () => ({ budgetsTotal, readsTotal }),
    );
    assert.equal(m.occurred, 0, `N+1 em ${m.occurred}/${m.runs}`);
  });
});
