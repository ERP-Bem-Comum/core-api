// Achado 1 — o lançamento órfão, agora erro, trava calibração e cenário (não só a importação).
//
// Força o cenário só pela porta pública: `addBudgetResult` recebe o budget do plano B e a
// subcategoria do plano A. Se a validação da API aceitar, o órfão existe; aprova-se B e tenta-se
// calibrá-lo. Ocorrência = a calibração de B é recusada por causa do órfão.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  memoryRepos,
  useCases,
  seedPlan,
  measure,
  ACTOR_REF,
  PROGRAM_ETI,
  PROGRAM_PARC,
} from './_world.ts';

describe('F1 — órfão criado pela API trava a calibração', () => {
  it('a calibração de plano aprovado nunca fica bloqueada por lançamento órfão', async () => {
    let apiAccepted = 0;
    const m = await measure(
      'F1',
      'API aceita lançamento cruzado; calibração do plano aprovado é recusada',
      async () => {
        const uc = useCases(memoryRepos());
        const a = await seedPlan(uc, {
          year: 2025,
          programRef: PROGRAM_ETI,
          budgets: 1,
          subcategories: 1,
          months: 1,
          approve: false,
        });
        const b = await seedPlan(uc, {
          year: 2025,
          programRef: PROGRAM_PARC,
          budgets: 1,
          subcategories: 1,
          months: 1,
          approve: false,
        });
        const crossed = await uc.addBudgetResult({
          budgetId: b.budgetIds[0]!,
          subcategoryId: a.subcategoryIds[0]!,
          month: 2,
          input: { kind: 'IPCA', baseValueInCents: 100, ipca: 0 },
        });
        if (!crossed.ok) return false; // a porta está fechada: não há órfão
        apiAccepted += 1;
        const approved = await uc.approve({ planId: b.planId, updatedByRef: ACTOR_REF });
        assert.ok(approved.ok, JSON.stringify(approved));
        const cal = await uc.startCalibration({ parentPlanId: b.planId, updatedByRef: ACTOR_REF });
        return !cal.ok && cal.error === 'budget-result-orphan-subcategory';
      },
      () => ({ apiAcceptedCrossPlanResult: apiAccepted }),
    );
    assert.equal(m.occurred, 0, `calibração bloqueada em ${m.occurred}/${m.runs}`);
  });
});
