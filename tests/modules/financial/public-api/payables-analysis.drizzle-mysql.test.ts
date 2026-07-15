/**
 * Integração (REP-3 · #114) — openPayablesAnalysisReader (financial public-api).
 * Agrega `fin_payable_view` por categoria × centro-de-custo × mês (DATE_FORMAT due_date), filtrando
 * período half-open [dueStart, dueEnd) e excluindo Cancelled. Valida contra MySQL real (x99).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * W0 RED: `openPayablesAnalysisReader` ainda não existe.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openPayablesAnalysisReader } from '#src/modules/financial/public-api/payables-analysis-projection.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const CAT_A = 'aa000000-0000-4000-8000-0000000000a1';
const CAT_B = 'bb000000-0000-4000-8000-0000000000b1';
const CC_1 = 'cc000000-0000-4000-8000-0000000000c1';
const NOW = new Date('2026-07-01T12:00:00.000Z');

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:payables-analysis] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openPayablesAnalysisReader — Drizzle + MySQL (REP-3 · #114)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:payables-analysis] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // `fin_payable_view` é read-model sem seed de migration e a asserção de contagem exige
      // exclusividade → o teste é dono da tabela inteira.
      await handle.db.delete(handle.schema.finPayableView);
      // `fin_categories`/`fin_cost_centers` TÊM seed (migrations 0012/0035) do qual outros testes da
      // suíte dependem — limpar só os ids deste teste, nunca a tabela.
      await handle.db
        .delete(handle.schema.finCategories)
        .where(inArray(handle.schema.finCategories.id, [CAT_A, CAT_B]));
      await handle.db
        .delete(handle.schema.finCostCenters)
        .where(inArray(handle.schema.finCostCenters.id, [CC_1]));
    });

    const payable = (over: {
      payableId: string;
      categoryRef: string | null;
      costCenterRef: string | null;
      valueCents: number;
      status: string;
      dueDate: string;
    }) => ({
      payableId: over.payableId,
      documentId: 'dc000000-0000-4000-8000-00000000d001',
      kind: 'Parent',
      supplierRef: null,
      contractRef: null,
      categoryRef: over.categoryRef,
      costCenterRef: over.costCenterRef,
      valueCents: over.valueCents,
      dueDate: over.dueDate,
      status: over.status,
      updatedAt: NOW,
    });

    it('CA4: agrega por categoria×CC×mês; período [start,end); Cancelled fora; nomes via JOIN', async () => {
      await handle.db.insert(handle.schema.finCategories).values([
        { id: CAT_A, name: 'Aluguel', group: 'despesa', active: true },
        { id: CAT_B, name: 'Energia', group: 'despesa', active: true },
      ]);
      await handle.db
        .insert(handle.schema.finCostCenters)
        .values({ id: CC_1, code: 'CC-001', name: 'Administrativo', active: true });

      await handle.db.insert(handle.schema.finPayableView).values([
        // dentro do período (jul + ago 2026)
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          categoryRef: CAT_A,
          costCenterRef: CC_1,
          valueCents: 100000,
          status: 'Open',
          dueDate: '2026-07-15',
        }),
        payable({
          payableId: '21000000-0000-4000-8000-000000000021',
          categoryRef: CAT_A,
          costCenterRef: CC_1,
          valueCents: 50000,
          status: 'Approved',
          dueDate: '2026-08-10',
        }),
        payable({
          payableId: '31000000-0000-4000-8000-000000000031',
          categoryRef: CAT_B,
          costCenterRef: null,
          valueCents: 30000,
          status: 'Paid',
          dueDate: '2026-07-20',
        }),
        // antes do período (< dueStart) → fora
        payable({
          payableId: '41000000-0000-4000-8000-000000000041',
          categoryRef: CAT_A,
          costCenterRef: CC_1,
          valueCents: 999,
          status: 'Open',
          dueDate: '2026-06-15',
        }),
        // >= dueEnd (half-open) → fora
        payable({
          payableId: '51000000-0000-4000-8000-000000000051',
          categoryRef: CAT_A,
          costCenterRef: CC_1,
          valueCents: 888,
          status: 'Open',
          dueDate: '2026-09-05',
        }),
        // Cancelled → fora
        payable({
          payableId: '61000000-0000-4000-8000-000000000061',
          categoryRef: CAT_A,
          costCenterRef: CC_1,
          valueCents: 777,
          status: 'Cancelled',
          dueDate: '2026-07-10',
        }),
      ]);

      const readerR = await openPayablesAnalysisReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list({ dueStart: '2026-07-01', dueEnd: '2026-09-01' });
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      // 3 grupos: (A,CC1,jul) (A,CC1,ago) (B,null,jul)
      assert.equal(r.value.length, 3, JSON.stringify(r.value));
      const key = (x: {
        categoryRef: string | null;
        costCenterRef: string | null;
        monthYear: string;
      }) => `${x.categoryRef ?? 'null'}|${x.costCenterRef ?? 'null'}|${x.monthYear}`;
      const byKey = new Map(r.value.map((x) => [key(x), x]));

      const jul = byKey.get(`${CAT_A}|${CC_1}|2026-07`)!;
      assert.equal(jul.totalCents, 100000);
      assert.equal(jul.categoryName, 'Aluguel');
      assert.equal(jul.costCenterName, 'Administrativo');

      const ago = byKey.get(`${CAT_A}|${CC_1}|2026-08`)!;
      assert.equal(ago.totalCents, 50000);

      const bJul = byKey.get(`${CAT_B}|null|2026-07`)!;
      assert.equal(bJul.totalCents, 30000);
      assert.equal(bJul.categoryName, 'Energia');
      assert.equal(bJul.costCenterName, null);
    });
  });
}
