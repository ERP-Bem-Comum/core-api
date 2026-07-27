/**
 * Integração (REP-3 · #114/#446 Slice C) — openPayablesAnalysisReader (financial public-api).
 * Agrega `fin_payable_view` por **Plano Orçamentário × centro-de-custo × mês** (DATE_FORMAT
 * due_date), filtrando período half-open [dueStart, dueEnd) e excluindo Cancelled. Valida contra
 * MySQL real (x99). #446: a raiz é o `budget_plan_ref` (carimbado no Slice B); a CATEGORIA saiu do
 * grão. Nome da folha (CC) via LEFT JOIN `fin_cost_centers`; o rótulo do plano é costurado no
 * reports (sem JOIN cross-módulo aqui).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openPayablesAnalysisReader } from '#src/modules/financial/public-api/payables-analysis-projection.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  mysqlTestConnectionString();

const PLAN_A = 'aa000000-0000-4000-8000-0000000000a1';
const PLAN_B = 'bb000000-0000-4000-8000-0000000000b1';
const CC_1 = 'cc000000-0000-4000-8000-0000000000c1';
const NOW = new Date('2026-07-01T12:00:00.000Z');

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:payables-analysis] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openPayablesAnalysisReader — Drizzle + MySQL (REP-3 · #446 — raiz = Plano)', () => {
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
      // `fin_cost_centers` TEM seed (migration 0035) do qual outros testes da suíte dependem —
      // limpar só os ids deste teste, nunca a tabela.
      await handle.db
        .delete(handle.schema.finCostCenters)
        .where(inArray(handle.schema.finCostCenters.id, [CC_1]));
    });

    const payable = (over: {
      payableId: string;
      budgetPlanRef: string | null;
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
      categoryRef: null,
      budgetPlanRef: over.budgetPlanRef,
      costCenterRef: over.costCenterRef,
      valueCents: over.valueCents,
      dueDate: over.dueDate,
      status: over.status,
      updatedAt: NOW,
    });

    it('CA4: agrega por plano×CC×mês; período [start,end); Cancelled fora; nome do CC via JOIN', async () => {
      await handle.db
        .insert(handle.schema.finCostCenters)
        .values({ id: CC_1, code: 'CC-001', name: 'Administrativo', active: true });

      await handle.db.insert(handle.schema.finPayableView).values([
        // dentro do período (jul + ago 2026) — Plano A no CC_1
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          budgetPlanRef: PLAN_A,
          costCenterRef: CC_1,
          valueCents: 100000,
          status: 'Open',
          dueDate: '2026-07-15',
        }),
        payable({
          payableId: '21000000-0000-4000-8000-000000000021',
          budgetPlanRef: PLAN_A,
          costCenterRef: CC_1,
          valueCents: 50000,
          status: 'Approved',
          dueDate: '2026-08-10',
        }),
        // Plano B, sem CC → grupo folha id null
        payable({
          payableId: '31000000-0000-4000-8000-000000000031',
          budgetPlanRef: PLAN_B,
          costCenterRef: null,
          valueCents: 30000,
          status: 'Paid',
          dueDate: '2026-07-20',
        }),
        // antes do período (< dueStart) → fora
        payable({
          payableId: '41000000-0000-4000-8000-000000000041',
          budgetPlanRef: PLAN_A,
          costCenterRef: CC_1,
          valueCents: 999,
          status: 'Open',
          dueDate: '2026-06-15',
        }),
        // >= dueEnd (half-open) → fora
        payable({
          payableId: '51000000-0000-4000-8000-000000000051',
          budgetPlanRef: PLAN_A,
          costCenterRef: CC_1,
          valueCents: 888,
          status: 'Open',
          dueDate: '2026-09-05',
        }),
        // Cancelled → fora
        payable({
          payableId: '61000000-0000-4000-8000-000000000061',
          budgetPlanRef: PLAN_A,
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
        budgetPlanRef: string | null;
        costCenterRef: string | null;
        monthYear: string;
      }) => `${x.budgetPlanRef ?? 'null'}|${x.costCenterRef ?? 'null'}|${x.monthYear}`;
      const byKey = new Map(r.value.map((x) => [key(x), x]));

      const jul = byKey.get(`${PLAN_A}|${CC_1}|2026-07`)!;
      assert.equal(jul.totalCents, 100000);
      assert.equal(jul.costCenterName, 'Administrativo');

      const ago = byKey.get(`${PLAN_A}|${CC_1}|2026-08`)!;
      assert.equal(ago.totalCents, 50000);

      const bJul = byKey.get(`${PLAN_B}|null|2026-07`)!;
      assert.equal(bJul.totalCents, 30000);
      assert.equal(bJul.costCenterName, null);
    });
  });
}
