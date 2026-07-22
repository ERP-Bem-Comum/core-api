// Integração Drizzle/MySQL do BudgetPlanRepository. Roda a MESMA suite de contrato
// (budget-plan-repository.suite.ts) contra MySQL real. Opt-in MYSQL_INTEGRATION=1
// (padrão do projeto) — no `pnpm test` puro só o teste estrutural roda.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { isNotNull } from 'drizzle-orm';

import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';
import { runBudgetPlanRepositoryContract } from './budget-plan-repository.suite.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// Estrutural — sempre roda (mesmo sem DB).
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

  const truncate = async (h: BudgetPlansMysqlHandle): Promise<void> => {
    await h.db.delete(h.schema.bgpOutbox);
    await h.db.delete(h.schema.budgets);
    // FK auto-referente `parent_id` (onDelete restrict): filhos (cenários/calibrações) antes dos pais.
    await h.db.delete(h.schema.budgetPlans).where(isNotNull(h.schema.budgetPlans.parentId));
    await h.db.delete(h.schema.budgetPlans);
  };

  runBudgetPlanRepositoryContract('Drizzle/MySQL (truncated)', {
    make: async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await truncate(handle);
      return { repo: createDrizzleBudgetPlanRepository(handle) };
    },
  });
}
