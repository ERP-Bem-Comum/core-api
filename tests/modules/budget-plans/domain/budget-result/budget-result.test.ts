// BDG-BUDGET-CALC (#317) — W0/W1 RED. Entidade BudgetResult: compõe o guard de modelo
// (ensureMatchesLaunchType) + o cálculo (calculate) num smart constructor. Regra de negócio
// no domínio (application só orquestra) — application.md §"if de negócio mora no domain".
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';

// BGP-MONTH-PERSIST (#413): o mês entra no agregado. O VO já tem suíte própria
// (exercise-month.test.ts) — aqui interessa o agregado carregar a dimensão. O throw é de
// fixture inválida, não do domínio (permitido em tests/** — .claude/rules/testing.md).
const month = (raw: number) => {
  const m = ExerciseMonth.parse(raw);
  if (!m.ok) throw new Error(`fixture inválida: mês ${raw}`);
  return m.value;
};

describe('BudgetResult.create — guard de modelo + cálculo (#317)', () => {
  it('modelo casa com launchType da subcategoria → calcula e monta o resultado', () => {
    const r = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId: BudgetId.generate(),
      subcategoryId: SubcategoryId.generate(),
      month: month(1),
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
      month: month(1),
      input: { kind: 'CAED', numberOfEnrollments: 30, baseValueInCents: 5000 },
      subcategoryLaunchType: 'DESPESAS_PESSOAIS',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'calc-model-mismatch');
  });
});

describe('BudgetResult — dimensão mês (#413, CA6/CA7)', () => {
  it('o agregado carrega o mês informado', () => {
    const r = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId: BudgetId.generate(),
      subcategoryId: SubcategoryId.generate(),
      month: month(3),
      input: { kind: 'IPCA', baseValueInCents: 367092, ipca: 0 },
      subcategoryLaunchType: 'IPCA',
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.month, 3);
  });

  // A identidade de negócio passa a ser (budgetId, subcategoryId, MÊS) — é o que a UNIQUE protege.
  it('mesma conta em meses diferentes → resultados distintos, valores independentes (CA7)', () => {
    const budgetId = BudgetId.generate();
    const subcategoryId = SubcategoryId.generate();

    const marco = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId,
      subcategoryId,
      month: month(3),
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 0 },
      subcategoryLaunchType: 'IPCA',
    });
    const abril = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId,
      subcategoryId,
      month: month(4),
      input: { kind: 'IPCA', baseValueInCents: 250000, ipca: 0 },
      subcategoryLaunchType: 'IPCA',
    });

    assert.equal(marco.ok, true);
    assert.equal(abril.ok, true);
    if (!marco.ok || !abril.ok) return;

    assert.equal(marco.value.month, 3);
    assert.equal(abril.value.month, 4);
    assert.notEqual(marco.value.id, abril.value.id);
    assert.equal(marco.value.value.cents, 100000);
    assert.equal(abril.value.value.cents, 250000);
  });

  // "o mensal é a ENTRADA; o anual é o RESULTADO" (P.O., #454). Prova dela: 3.670,92 × 12.
  it('12 meses com o mesmo valor somam o anual (3.670,92 × 12 = 44.051,04)', () => {
    const budgetId = BudgetId.generate();
    const subcategoryId = SubcategoryId.generate();

    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) =>
      BudgetResult.create({
        id: BudgetResultId.generate(),
        budgetId,
        subcategoryId,
        month: month(m),
        input: { kind: 'IPCA', baseValueInCents: 367092, ipca: 0 },
        subcategoryLaunchType: 'IPCA',
      }),
    );

    assert.equal(
      meses.every((r) => r.ok),
      true,
    );
    const anual = meses.reduce((acc, r) => (r.ok ? acc + r.value.value.cents : acc), 0);
    assert.equal(anual, 4405104);
  });
});

describe('BudgetResult.clone — preserva o mês (#413, CA8)', () => {
  it('clonar para outro orçamento mantém o mês do lançamento de origem', () => {
    const source = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId: BudgetId.generate(),
      subcategoryId: SubcategoryId.generate(),
      month: month(9),
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 0 },
      subcategoryLaunchType: 'IPCA',
    });
    assert.equal(source.ok, true);
    if (!source.ok) return;

    const cloned = BudgetResult.clone(source.value, {
      id: BudgetResultId.generate(),
      budgetId: BudgetId.generate(),
      subcategoryId: SubcategoryId.generate(),
    });

    assert.equal(cloned.month, 9);
    assert.equal(cloned.value.cents, 100000);
  });
});
