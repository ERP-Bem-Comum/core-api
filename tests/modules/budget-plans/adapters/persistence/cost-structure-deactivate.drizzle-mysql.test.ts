// BGP-COST-STRUCTURE-EDIT (#454 gap 3) — W0 RED — CA8 (Drizzle + MySQL real).
//
// Desativar um nó NÃO pode encostar nos lançamentos. O risco é concreto e não hipotético: a escrita
// da árvore é REPLACE-ALL (apaga os nós do plano e reinsere), e `bgp_budget_results.subcategory_id`
// aponta para subcategorias SEM FK. Se o replace-all reinserisse com ids novos — ou se o CASCADE de
// `bgp_categories → bgp_subcategories` levasse algo junto sem repor —, os lançamentos ficariam
// órfãos apontando para uma subcategoria inexistente, e o total por Rede passaria a somar lixo.
//
// É o mesmo defeito que o #453 gastou uma transação inteira para evitar, por outro caminho.
//
// GATE: MYSQL_INTEGRATION=1. RED esperado: `setSubcategoryActive` ainda não existe.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import {
  empty,
  addCostCenter,
  addCategory,
  addSubcategory,
  setSubcategoryActive,
} from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';
import { createDrizzleBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle.ts';
import { createDrizzleCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.drizzle.ts';

const VALID_CONN =
  process.env['BUDGET_PLANS_DATABASE_URL'] ??
  'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const NOW = new Date('2026-07-16T12:00:00.000Z');
const ACTOR = (() => {
  const r = UserRef.rehydrate('00000000-0000-4000-8000-000000000001');
  if (!r.ok) throw new Error('setup: actor');
  return r.value;
})();
const MONTH = (() => {
  const m = ExerciseMonth.parse(1);
  if (!m.ok) throw new Error('fixture: mês');
  return m.value;
})();

describe('cost-structure deactivate — shape', () => {
  it('createDrizzleCostStructureRepository é função', () => {
    assert.equal(typeof createDrizzleCostStructureRepository, 'function');
  });
});

if (integrationEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;

  before(async () => {
    const r = await openBudgetPlansMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openBudgetPlansMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  const truncate = async (h: BudgetPlansMysqlHandle): Promise<void> => {
    await h.db.delete(h.schema.bgpOutbox);
    await h.db.delete(h.schema.budgetResults);
    await h.db.delete(h.schema.budgets);
    await h.db.delete(h.schema.subcategories);
    await h.db.delete(h.schema.categories);
    await h.db.delete(h.schema.costCenters);
    await h.db.delete(h.schema.budgetPlans);
  };

  describe('#454 gap 3 — desativar não encosta no lançamento (Drizzle + MySQL)', () => {
    it('CA8: subcategoria desativada → o bgp_budget_results dela continua íntegro', async () => {
      assert.ok(handle !== null);
      await truncate(handle);

      const planRepo = createDrizzleBudgetPlanRepository(handle);
      const resultRepo = createDrizzleBudgetResultRepository(handle);
      const costRepo = createDrizzleCostStructureRepository(handle);

      // Plano + orçamento (o result precisa dos dois).
      const planId = BudgetPlanId.generate();
      const programRef = ProgramRef.rehydrate('44444444-4444-4444-8444-444444444444');
      assert.ok(isOk(programRef));
      const created = BudgetPlan.create({
        id: planId,
        year: 2026,
        programRef: programRef.value,
        now: NOW,
        actor: ACTOR,
      });
      assert.ok(isOk(created));
      const stateRef = PartnerStateRef.rehydrate('CE');
      assert.ok(isOk(stateRef));
      const money = Money.fromCents(500000);
      assert.ok(isOk(money));
      const budgetId = BudgetId.generate();
      const withBudget = BudgetPlan.addBudget(
        created.value.plan,
        { id: budgetId, partner: { kind: 'state', ref: stateRef.value }, value: money.value },
        NOW,
        ACTOR,
      );
      assert.ok(isOk(withBudget));
      assert.ok(isOk(await planRepo.save(withBudget.value.plan, [])));

      // Árvore 1×1×1.
      const ccId = CostCenterId.generate();
      const catId = CategoryId.generate();
      const subId = SubcategoryId.generate();
      let tree = empty(planId);
      const t1 = addCostCenter(
        tree,
        { id: ccId, name: 'Operacional', direction: 'A PAGAR' },
        'RASCUNHO',
      );
      assert.ok(isOk(t1));
      const t2 = addCategory(
        t1.value,
        { id: catId, costCenterId: ccId, name: 'Pessoal' },
        'RASCUNHO',
      );
      assert.ok(isOk(t2));
      const t3 = addSubcategory(
        t2.value,
        { id: subId, categoryId: catId, name: 'Salários', launchType: 'IPCA' },
        'RASCUNHO',
      );
      assert.ok(isOk(t3));
      tree = t3.value;
      assert.ok(isOk(await costRepo.save(tree)));

      // Lançamento NA subcategoria que vai ser desativada.
      const resultR = BudgetResult.create({
        id: BudgetResultId.generate(),
        budgetId,
        subcategoryId: subId,
        month: MONTH,
        input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
        subcategoryLaunchType: 'IPCA',
      });
      assert.ok(isOk(resultR));
      assert.ok(isOk(await resultRepo.save(resultR.value)));

      // Desativa via `mutate` — o caminho real de escrita (replace-all guardado por status).
      const muted = await costRepo.mutate(planId, (s, status) =>
        setSubcategoryActive(s, subId, false, status),
      );
      assert.ok(isOk(muted), `mutate falhou — ${JSON.stringify(muted)}`);

      // 1) O lançamento continua lá, apontando para a MESMA subcategoria.
      const rows = await handle.db
        .select({
          id: handle.schema.budgetResults.id,
          sub: handle.schema.budgetResults.subcategoryId,
        })
        .from(handle.schema.budgetResults)
        .where(eq(handle.schema.budgetResults.budgetId, budgetId as unknown as string));
      assert.equal(rows.length, 1, 'desativar NÃO apaga lançamento');
      assert.equal(
        rows[0]?.sub,
        String(subId),
        'o lançamento segue ancorado na mesma subcategoria',
      );

      // 2) E a subcategoria ainda existe (soft) — senão o lançamento estaria órfão.
      const found = await costRepo.findByBudgetPlanId(planId);
      assert.ok(isOk(found));
      const sub = found.value.costCenters[0]?.categories[0]?.subcategories[0];
      assert.equal(String(sub?.id), String(subId), 'replace-all preservou o id — nada de id novo');
      assert.equal(sub?.active, false);
    });
  });
}
