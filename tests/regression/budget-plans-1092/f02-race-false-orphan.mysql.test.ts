// Achado 2 — versão NATURAL, no MySQL real: sem gancho nenhum, o usuário A cria um cenário e o
// usuário B, ao mesmo tempo, cria uma subcategoria e lança nela. Ocorrência = A recebe órfão falso.
// GATE: MYSQL_INTEGRATION=1.
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import {
  mysqlEnabled,
  mysqlRepos,
  useCases,
  seedPlan,
  measure,
  truncateBudgetPlans,
  ACTOR_REF,
  PROGRAM_ETI,
} from './_world.ts';

if (mysqlEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;
  before(async () => {
    const r = await openBudgetPlansMysql({
      connectionString: mysqlTestConnectionString(),
      applyMigrations: true,
    });
    if (!r.ok) throw new Error(`fixture: ${r.error}`);
    handle = r.value;
  });
  after(async () => {
    if (handle !== null) await handle.close();
  });

  describe('F2 (natural, MySQL) — cenário concorrente a uma edição da origem', () => {
    it('nunca devolve órfão falso', async () => {
      const outcomes: Record<string, number> = {};
      const m = await measure(
        'F2-natural',
        'cenário e lançamento novo disparados juntos na mesma origem RASCUNHO',
        async () => {
          if (handle === null) throw new Error('handle');
          await truncateBudgetPlans(handle);
          const uc = useCases(mysqlRepos(handle));
          const plan = await seedPlan(uc, {
            year: 2026,
            programRef: PROGRAM_ETI,
            budgets: 1,
            subcategories: 1,
            months: 1,
            approve: false,
          });
          const userB = async () => {
            const tree = await uc.addSubcategory({
              budgetPlanId: plan.planId,
              categoryId: plan.categoryId,
              name: 'Nova',
              launchType: 'IPCA',
            });
            if (!tree.ok) return;
            const sub = tree.value.costCenters[0]!.categories[0]!.subcategories.find(
              (s) => s.name === 'Nova',
            );
            await uc.addBudgetResult({
              budgetId: plan.budgetIds[0]!,
              subcategoryId: String(sub!.id),
              month: 1,
              input: { kind: 'IPCA', baseValueInCents: 100, ipca: 0 },
            });
          };
          const [sc] = await Promise.all([
            uc.createScenery({ parentPlanId: plan.planId, name: 'A', updatedByRef: ACTOR_REF }),
            userB(),
          ]);
          const key = sc.ok ? 'ok' : sc.error;
          outcomes[key] = (outcomes[key] ?? 0) + 1;
          return !sc.ok && sc.error === 'budget-result-orphan-subcategory';
        },
        () => ({ outcomes }),
      );
      assert.equal(m.occurred, 0, `órfão falso em ${m.occurred}/${m.runs}`);
    });
  });
}
