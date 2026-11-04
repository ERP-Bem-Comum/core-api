// Achado 2 — corrida na origem RASCUNHO: a árvore e os lançamentos são lidos em momentos diferentes.
//
// FORÇADO (memória): o `findByBudgetPlanId` da cópia, logo depois de ler a árvore, deixa o usuário
// B criar uma subcategoria e lançar nela — exatamente a janela descrita no achado. Ocorrência = o
// cenário do usuário A é recusado como "órfão" sem que exista órfão nenhum.
// A versão NATURAL (concorrência real no MySQL) está em f02-race-false-orphan.mysql.test.ts.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { CostStructureRepository } from '#src/modules/budget-plans/domain/cost-structure/repository.ts';
import { memoryRepos, useCases, seedPlan, measure, ACTOR_REF, PROGRAM_ETI } from './_world.ts';

describe('F2 (forçado) — edição concorrente na origem vira órfão falso', () => {
  it('criar cenário durante uma edição da origem nunca devolve órfão falso', async () => {
    const m = await measure(
      'F2-forcado',
      'usuário B lança entre a leitura da árvore e a dos lançamentos',
      async () => {
        const base = memoryRepos();
        let interleave: (() => Promise<void>) | null = null;
        const costStructureRepo: CostStructureRepository = {
          ...base.costStructureRepo,
          findByBudgetPlanId: async (id) => {
            const tree = await base.costStructureRepo.findByBudgetPlanId(id);
            const hook = interleave;
            interleave = null;
            if (hook !== null) await hook();
            return tree;
          },
        };
        const uc = useCases({ ...base, costStructureRepo });
        const plan = await seedPlan(uc, {
          year: 2026,
          programRef: PROGRAM_ETI,
          budgets: 1,
          subcategories: 1,
          months: 1,
          approve: false,
        });
        interleave = async () => {
          const tree = await uc.addSubcategory({
            budgetPlanId: plan.planId,
            categoryId: plan.categoryId,
            name: 'Nova',
            launchType: 'IPCA',
          });
          assert.ok(tree.ok);
          const sub = tree.value.costCenters[0]!.categories[0]!.subcategories.find(
            (s) => s.name === 'Nova',
          );
          const launched = await uc.addBudgetResult({
            budgetId: plan.budgetIds[0]!,
            subcategoryId: String(sub!.id),
            month: 1,
            input: { kind: 'IPCA', baseValueInCents: 100, ipca: 0 },
          });
          assert.ok(launched.ok);
        };
        const sc = await uc.createScenery({
          parentPlanId: plan.planId,
          name: 'A',
          updatedByRef: ACTOR_REF,
        });
        return !sc.ok && sc.error === 'budget-result-orphan-subcategory';
      },
    );
    assert.equal(m.occurred, 0, `órfão falso em ${m.occurred}/${m.runs}`);
  });
});
