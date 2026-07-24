// Integração Drizzle/MySQL do CostStructureRepository. Roda a MESMA suite de contrato
// (cost-structure-repository.suite.ts) contra MySQL real. Opt-in MYSQL_INTEGRATION=1
// (padrão do projeto) — no `pnpm test` puro só o teste estrutural roda.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.drizzle.ts';
import { runCostStructureRepositoryContract } from './cost-structure-repository.suite.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const VALID_CONN = mysqlTestConnectionString();

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// Estrutural — sempre roda (mesmo sem DB).
describe('createDrizzleCostStructureRepository — shape', () => {
  it('é uma função', () => {
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

  // Child-first delete cobre qualquer resíduo; a árvore de custo cai por cascade da raiz,
  // mas limpamos tudo (inclui bgp_budget_plans, pai da FK).
  const truncate = async (h: BudgetPlansMysqlHandle): Promise<void> => {
    await h.db.delete(h.schema.subcategories);
    await h.db.delete(h.schema.categories);
    await h.db.delete(h.schema.costCenters);
    await h.db.delete(h.schema.budgetPlans);
  };

  const NOW = new Date('2026-07-08T12:00:00.000Z');

  const seedBudgetPlan = async (h: BudgetPlansMysqlHandle): Promise<BudgetPlanId.BudgetPlanId> => {
    const id = BudgetPlanId.generate();
    await h.db.insert(h.schema.budgetPlans).values({
      id: String(id),
      year: 2026,
      programRef: randomUUID(),
      versionMajor: 1,
      versionMinor: 0,
      status: 'RASCUNHO',
      createdAt: NOW,
      updatedAt: NOW,
    });
    return id;
  };

  runCostStructureRepositoryContract('Drizzle/MySQL (truncated)', {
    make: async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await truncate(handle);
      const budgetPlanId = await seedBudgetPlan(handle);
      return { repo: createDrizzleCostStructureRepository(handle), budgetPlanId };
    },
  });
}
