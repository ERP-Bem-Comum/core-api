// BDG-PLAN-LIFECYCLE (US4) — integração Drizzle/MySQL do ciclo de vida contra MySQL 8.4 real.
// Valida o que só o banco real pega: FK auto-referente parent_id (migration 0004), listChildren,
// findRootByYearAndProgram com parentId IS NULL, e a alocação de versão que fecha o Blocker do W2
// (2 cenários do mesmo pai não colidem na UNIQUE). Opt-in MYSQL_INTEGRATION=1.
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { isNotNull } from 'drizzle-orm';

import { isOk } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { ProgramRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';
import { createDrizzleCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.drizzle.ts';
import { createDrizzleBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle.ts';
import { startCalibration } from '#src/modules/budget-plans/application/use-cases/start-calibration.ts';
import { createScenery } from '#src/modules/budget-plans/application/use-cases/create-scenery.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const VALID_CONN = mysqlTestConnectionString();
const NOW = new Date('2026-07-09T12:00:00.000Z');
const PROGRAM = '11111111-1111-4111-8111-111111111111';
// Ator padrão dos testes (BGP-UPDATED-BY-AUDIT/#373).
const ACTOR_REF = '00000000-0000-4000-8000-000000000001';
const ACTOR = (() => {
  const r = UserRef.rehydrate(ACTOR_REF);
  assert.ok(isOk(r));
  return r.value;
})();

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

describe('createDrizzleBudgetPlanRepository — shape', () => {
  it('é uma função', () => {
    assert.equal(typeof createDrizzleBudgetPlanRepository, 'function');
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

  // FK auto-ref restrict: filhos (parent_id NOT NULL) antes dos pais.
  const truncate = async (h: BudgetPlansMysqlHandle): Promise<void> => {
    await h.db.delete(h.schema.budgetResults);
    await h.db.delete(h.schema.subcategories);
    await h.db.delete(h.schema.categories);
    await h.db.delete(h.schema.costCenters);
    await h.db.delete(h.schema.budgets);
    await h.db.delete(h.schema.budgetPlans).where(isNotNull(h.schema.budgetPlans.parentId));
    await h.db.delete(h.schema.budgetPlans);
  };

  const seedRoot = async (h: BudgetPlansMysqlHandle, approve: boolean) => {
    const planId = BudgetPlanId.generate();
    const programRef = ProgramRef.rehydrate(PROGRAM);
    assert.ok(isOk(programRef));
    const created = BudgetPlan.create({
      id: planId,
      year: 2026,
      programRef: programRef.value,
      now: NOW,
      actor: ACTOR,
    });
    assert.ok(isOk(created));
    let plan = created.value.plan;
    if (approve) {
      const a = BudgetPlan.approve(plan, NOW, ACTOR);
      assert.ok(isOk(a));
      plan = a.value.plan;
    }
    const repo = createDrizzleBudgetPlanRepository(h);
    assert.ok(isOk(await repo.save(plan, [])));
    return planId;
  };

  it('start-calibration persiste filho na árvore (FK auto-ref) + listChildren + findRoot só a raiz', async () => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    await truncate(handle);
    const rootId = await seedRoot(handle, true);
    const deps = {
      planRepo: createDrizzleBudgetPlanRepository(handle),
      costStructureRepo: createDrizzleCostStructureRepository(handle),
      budgetResultRepo: createDrizzleBudgetResultRepository(handle),
      clock: ClockFixed(NOW),
    };

    const r = await startCalibration(deps)({
      parentPlanId: String(rootId),
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'EM_CALIBRACAO');
    assert.equal(String(r.value.plan.parentId), String(rootId)); // FK auto-ref persistiu

    const children = await deps.planRepo.listChildren(rootId);
    assert.ok(isOk(children));
    assert.equal(children.value.length, 1);

    // findRoot ignora o filho, devolve a raiz
    const programRef = ProgramRef.rehydrate(PROGRAM);
    assert.ok(isOk(programRef));
    const root = await deps.planRepo.findRootByYearAndProgram(2026, programRef.value);
    assert.ok(isOk(root));
    assert.equal(String(root.value?.id), String(rootId));
    assert.equal(root.value?.parentId, null);
  });

  it('2 cenários do mesmo pai não colidem na UNIQUE (Blocker do W2, no MySQL real)', async () => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    await truncate(handle);
    const rootId = await seedRoot(handle, false); // RASCUNHO
    const deps = {
      planRepo: createDrizzleBudgetPlanRepository(handle),
      costStructureRepo: createDrizzleCostStructureRepository(handle),
      budgetResultRepo: createDrizzleBudgetResultRepository(handle),
      clock: ClockFixed(NOW),
    };

    const a = await createScenery(deps)({
      parentPlanId: String(rootId),
      name: 'A',
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isOk(a));
    assert.equal(a.value.plan.version.minor, 1);

    const b = await createScenery(deps)({
      parentPlanId: String(rootId),
      name: 'B',
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isOk(b)); // não colide na UNIQUE (year, program_ref, version) — Blocker corrigido
    assert.equal(b.value.plan.version.minor, 2);
  });
}
