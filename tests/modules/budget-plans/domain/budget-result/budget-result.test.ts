// BDG-BUDGET-CALC (#317) — W0/W1 RED. Entidade BudgetResult: compõe o guard de modelo
// (ensureMatchesLaunchType) + o cálculo (calculate) num smart constructor. Regra de negócio
// no domínio (application só orquestra) — application.md §"if de negócio mora no domain".
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';

describe('BudgetResult.create — guard de modelo + cálculo (#317)', () => {
  it('modelo casa com launchType da subcategoria → calcula e monta o resultado', () => {
    const r = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId: BudgetId.generate(),
      subcategoryId: SubcategoryId.generate(),
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
      subcategoryLaunchType: 'IPCA',
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.model, 'IPCA');
    assert.equal(r.value.value.cents, 104500);
  });

  it('modelo diverge do launchType da subcategoria → calc-model-mismatch (não calcula)', () => {
    const r = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId: BudgetId.generate(),
      subcategoryId: SubcategoryId.generate(),
      input: { kind: 'CAED', numberOfEnrollments: 30, baseValueInCents: 5000 },
      subcategoryLaunchType: 'DESPESAS_PESSOAIS',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'calc-model-mismatch');
  });
});
