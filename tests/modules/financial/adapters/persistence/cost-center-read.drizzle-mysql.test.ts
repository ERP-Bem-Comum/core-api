// Teste de integração: CostCenterReadPort (Drizzle + MySQL real) — dados de referência 020 · US2.
// Valida list() lendo os centros de custo SEMEADOS pela migration 0013 (ativos, ordenado por code).
// GATE: só roda com MYSQL_INTEGRATION=1 (package.json §test:integration:financial).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCostCenterReadStore } from '#src/modules/financial/adapters/persistence/repos/cost-center-read.drizzle.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:cost-center-read] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('CostCenterReadPort — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) {
        throw new Error(`[financial:cost-center-read] Falha ao conectar ao MySQL: ${r.error}`);
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('list() lê o seed da migration 0013 — ativos, ordenado por code', async () => {
      const store = createDrizzleCostCenterReadStore(handle);
      const r = await store.list();
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.ok(r.value.length >= 5, 'o seed da 0013 deve popular ≥5 centros de custo');
        for (const c of r.value) {
          assert.equal(c.active, true);
          assert.ok(c.code.length > 0);
          assert.ok(c.name.length > 0);
        }
        const codes = r.value.map((c) => c.code);
        assert.deepEqual([...codes], [...codes].sort(), 'itens ordenados por code (ASCII)');
        assert.ok(codes.includes('CC-001'), 'CC-001 (Administrativo) presente');
      }
    });
  });
}
