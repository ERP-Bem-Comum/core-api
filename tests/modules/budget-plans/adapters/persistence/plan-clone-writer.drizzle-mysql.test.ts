// #1092 — `createDrizzlePlanCloneWriter` contra MySQL 8.4 real: a cópia de um plano (cabeçalho +
// budgets + outbox, árvore de custos, lançamentos) grava TUDO OU NADA.
//   - Caminho feliz: 50 subcategorias × 12 meses = 600 lançamentos, mais que um lote de INSERT (500),
//                    voltam inteiros, com o total certo.
//   - Rollback:      o último passo falha DENTRO da tx (dois lançamentos com a mesma chave
//                    budget × subcategoria × mês batem na UNIQUE) DEPOIS de plano e árvore já terem
//                    sido inseridos -> nada fica gravado: nem plano, nem árvore, nem lançamento.
//
// GATE: MYSQL_INTEGRATION=1 (registrado no runner, suíte budget-plans). Sem o env, só o teste
// estrutural roda no `pnpm test` puro.

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq, isNotNull } from 'drizzle-orm';

import { isOk, isErr } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as CostStructure from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import type { CostStructure as CostStructureEntity } from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';
import { createDrizzleCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.drizzle.ts';
import { createDrizzleBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle.ts';
import { createDrizzlePlanCloneWriter } from '#src/modules/budget-plans/adapters/persistence/repos/plan-clone-writer.drizzle.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const VALID_CONN = mysqlTestConnectionString();
const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const PROGRAM = '11111111-1111-4111-8111-111111111111';
const ACTOR = (() => {
  const r = UserRef.rehydrate('00000000-0000-4000-8000-000000000001');
  if (!r.ok) throw new Error('setup: actor');
  return r.value;
})();

describe('createDrizzlePlanCloneWriter — shape', () => {
  it('é uma função', () => {
    assert.equal(typeof createDrizzlePlanCloneWriter, 'function');
  });
});

// Plano novo (RASCUNHO, com evento) + 1 rede + árvore com `subcategoryCount` subcategorias + 12 meses
// de lançamento em cada uma, todos de 100 centavos.
const buildContent = (subcategoryCount: number) => {
  const planId = BudgetPlanId.generate();
  const programRef = ProgramRef.rehydrate(PROGRAM);
  const stateRef = PartnerStateRef.rehydrate('CE');
  if (!programRef.ok || !stateRef.ok) throw new Error('setup: refs');
  const created = BudgetPlan.create({
    id: planId,
    year: 2026,
    programRef: programRef.value,
    now: NOW,
    actor: ACTOR,
  });
  if (!created.ok) throw new Error('setup: plano');
  const budgetId = BudgetId.generate();
  const withBudget = BudgetPlan.addBudget(
    created.value.plan,
    { id: budgetId, partner: { kind: 'state', ref: stateRef.value } },
    NOW,
    ACTOR,
  );
  if (!withBudget.ok) throw new Error('setup: budget');

  const ccId = CostCenterId.generate();
  const catId = CategoryId.generate();
  const cc = CostStructure.addCostCenter(
    CostStructure.empty(planId),
    { id: ccId, name: 'Pessoal', direction: 'A PAGAR' },
    'RASCUNHO',
  );
  if (!cc.ok) throw new Error('setup: cc');
  const cat = CostStructure.addCategory(
    cc.value,
    { id: catId, costCenterId: ccId, name: 'Salários' },
    'RASCUNHO',
  );
  if (!cat.ok) throw new Error('setup: cat');
  let structure: CostStructureEntity = cat.value;
  const subIds: SubcategoryId.SubcategoryId[] = [];
  for (let i = 0; i < subcategoryCount; i += 1) {
    const id = SubcategoryId.generate();
    const next = CostStructure.addSubcategory(
      structure,
      { id, categoryId: catId, name: `Sub ${String(i).padStart(3, '0')}`, launchType: 'IPCA' },
      'RASCUNHO',
    );
    if (!next.ok) throw new Error('setup: sub');
    structure = next.value;
    subIds.push(id);
  }

  const results: BudgetResult.BudgetResult[] = [];
  for (const subcategoryId of subIds) {
    for (let m = 1; m <= 12; m += 1) {
      const month = ExerciseMonth.parse(m);
      if (!month.ok) throw new Error('setup: mês');
      const r = BudgetResult.create({
        id: BudgetResultId.generate(),
        budgetId,
        subcategoryId,
        month: month.value,
        input: { kind: 'IPCA', baseValueInCents: 100, ipca: 0 },
        subcategoryLaunchType: 'IPCA',
      });
      if (!r.ok) throw new Error('setup: lançamento');
      results.push(r.value);
    }
  }

  return {
    plan: withBudget.value.plan,
    events: [created.value.event],
    structure,
    results,
    budgetId,
  };
};

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

  // Limpa na ENTRADA, por tabela (rule testing.md). FK auto-ref: filhos antes dos pais.
  beforeEach(async () => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    const h = handle;
    await h.db.delete(h.schema.budgetResults);
    await h.db.delete(h.schema.subcategories);
    await h.db.delete(h.schema.categories);
    await h.db.delete(h.schema.costCenters);
    await h.db.delete(h.schema.budgets);
    await h.db.delete(h.schema.budgetPlans).where(isNotNull(h.schema.budgetPlans.parentId));
    await h.db.delete(h.schema.budgetPlans);
  });

  it('grava plano, árvore e 600 lançamentos (mais de um lote) numa transação', async () => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    const content = buildContent(50);

    const written = await createDrizzlePlanCloneWriter(handle).write(content);
    assert.ok(isOk(written));

    const plan = await createDrizzleBudgetPlanRepository(handle).findById(content.plan.id);
    assert.ok(isOk(plan));
    assert.equal(plan.value?.budgets.length, 1);

    const tree = await createDrizzleCostStructureRepository(handle).findByBudgetPlanId(
      content.plan.id,
    );
    assert.ok(isOk(tree));
    assert.equal(tree.value.costCenters[0]?.categories[0]?.subcategories.length, 50);

    const sums = await createDrizzleBudgetResultRepository(handle).sumByBudgetIds([
      content.budgetId,
    ]);
    assert.ok(isOk(sums));
    assert.equal(sums.value.get(String(content.budgetId))?.cents, 600 * 100);
  });

  it('falha no último passo -> ROLLBACK: nada de plano, árvore ou lançamento', async () => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    const content = buildContent(2);
    const first = content.results[0];
    assert.ok(first !== undefined);
    // Mesma chave (budget × subcategoria × mês) com id novo: a UNIQUE recusa o INSERT dos
    // lançamentos, que roda DEPOIS do plano e da árvore dentro da mesma transação.
    const duplicated = { ...first, id: BudgetResultId.generate() };

    const written = await createDrizzlePlanCloneWriter(handle).write({
      ...content,
      results: [...content.results, duplicated],
    });
    assert.ok(isErr(written));
    assert.equal(written.error, 'plan-clone-write-unavailable');

    const h = handle;
    const planRows = await h.db
      .select({ id: h.schema.budgetPlans.id })
      .from(h.schema.budgetPlans)
      .where(eq(h.schema.budgetPlans.id, String(content.plan.id)));
    assert.equal(planRows.length, 0, 'plano não pode ficar gravado');
    const ccRows = await h.db
      .select({ id: h.schema.costCenters.id })
      .from(h.schema.costCenters)
      .where(eq(h.schema.costCenters.budgetPlanId, String(content.plan.id)));
    assert.equal(ccRows.length, 0, 'árvore não pode ficar gravada');
    const resultRows = await h.db
      .select({ id: h.schema.budgetResults.id })
      .from(h.schema.budgetResults)
      .where(eq(h.schema.budgetResults.budgetId, String(content.budgetId)));
    assert.equal(resultRows.length, 0, 'nenhum lançamento pode ficar gravado');
  });
}
