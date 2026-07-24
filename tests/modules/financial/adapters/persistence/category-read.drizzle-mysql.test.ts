// Teste de integração: CategoryReadPort (Drizzle + MySQL real) — dados de referência 020 · US1.
// Valida list() lendo as categorias SEMEADAS pela migration 0012 (ativas, group válido, ordenado).
// GATE: só roda com MYSQL_INTEGRATION=1 (package.json §test:integration:financial).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCategoryReadStore } from '#src/modules/financial/adapters/persistence/repos/category-read.drizzle.ts';
import { finCategories } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const GROUPS = ['despesa', 'receita', 'ajuste'] as const;
const GROUP_RANK: Record<(typeof GROUPS)[number], number> = { ajuste: 0, despesa: 1, receita: 2 };

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:category-read] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('CategoryReadPort — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok)
        throw new Error(`[financial:category-read] Falha ao conectar ao MySQL: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('list() lê o seed da migration 0012 — ativas, group válido, ordenado por group', async () => {
      const store = createDrizzleCategoryReadStore(handle);
      const r = await store.list();
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.ok(r.value.length >= 11, 'o seed da 0012 deve popular ≥11 categorias');
        for (const c of r.value) {
          assert.ok(GROUPS.includes(c.group), `group inválido: ${c.group}`);
          assert.equal(c.active, true);
          assert.ok(c.name.length > 0);
        }
        const groups = r.value.map((c) => c.group);
        assert.deepEqual(
          groups,
          [...groups].sort((a, b) => GROUP_RANK[a] - GROUP_RANK[b]),
          'itens ordenados por group (ajuste < despesa < receita)',
        );
      }
    });

    it('SC-002: ids fixos do seed são estáveis entre execuções', async () => {
      const store = createDrizzleCategoryReadStore(handle);
      const r = await store.list();
      assert.equal(r.ok, true);
      if (r.ok) {
        const ids = new Set(r.value.map((c) => String(c.id)));
        assert.ok(ids.has('f1ca7e90-0000-4000-8000-000000000001'), 'id fixo (Aluguel) presente');
        assert.ok(ids.has('f1ca7e90-0000-4000-8000-000000000006'), 'id fixo (Doações) presente');
      }
    });

    it('#341/CA1+CA4: list() retorna cost_center_id (migration 0035) — e null nas pré-existentes', async () => {
      const catId = newUuid();
      const ccId = newUuid();
      await handle.db.insert(finCategories).values({
        id: catId,
        name: 'Categoria 341',
        group: 'despesa',
        active: true,
        parentId: null,
        costCenterId: ccId,
      });

      const store = createDrizzleCategoryReadStore(handle);
      const r = await store.list();
      assert.equal(r.ok, true);
      if (r.ok) {
        const cat = r.value.find((c) => String(c.id) === catId);
        assert.ok(cat, 'categoria com cost_center_id presente');
        assert.equal(
          String(cat.costCenterId),
          ccId,
          'read retorna o centro de custo (Centro→Categoria)',
        );

        // Back-compat: categoria do seed 0012 (sem cost_center_id) → null.
        const seedCat = r.value.find(
          (c) => String(c.id) === 'f1ca7e90-0000-4000-8000-000000000001',
        );
        assert.equal(seedCat?.costCenterId, null, 'categoria pré-#341 lê costCenterId null');
      }
    });
  });
}
