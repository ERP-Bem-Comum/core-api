// Integração Drizzle/MySQL do BudgetResultRepository. Roda a MESMA suite de contrato
// (budget-result-repository.suite.ts) contra MySQL real. Opt-in MYSQL_INTEGRATION=1
// (padrão do projeto) — no `pnpm test` puro só o teste estrutural roda.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle.ts';
import { runBudgetResultRepositoryContract } from './budget-result-repository.suite.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// Estrutural — sempre roda (mesmo sem DB).
describe('createDrizzleBudgetResultRepository — shape', () => {
  it('é uma função', () => {
    assert.equal(typeof createDrizzleBudgetResultRepository, 'function');
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

  // Sem FK (D1): basta limpar a própria tabela entre casos.
  runBudgetResultRepositoryContract('Drizzle/MySQL (truncated)', {
    make: async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await handle.db.delete(handle.schema.budgetResults);
      return { repo: createDrizzleBudgetResultRepository(handle) };
    },
  });
}
