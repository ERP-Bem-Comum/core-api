/**
 * Integração (REP · #590 · Slice B) — openCashflowReader.listChart (financial public-api).
 * Série temporal: agrega `fin_payable_view` por Categoria × Subcategoria × MÊS (o mês vem de
 * `DATE_FORMAT(due_date, '%Y-%m-01')` → primeiro dia do mês) em 2 baldes:
 *  - EXPECTED = Σ(value_cents) WHERE status IN ('Open','Approved')
 *  - REALIZED = Σ(value_cents) WHERE status = 'Paid'
 * `Cancelled` sempre fora. Ordenação por mês ASC. Valida contra MySQL real (OrbStack).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openCashflowReader } from '#src/modules/financial/public-api/cashflow-projection.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  mysqlTestConnectionString();

const NOW = new Date('2026-07-14T12:00:00.000Z');

const CAT1 = 'ca000000-0000-4000-8000-0000000000e1';
const SUB1 = '5b000000-0000-4000-8000-0000005b00e1';
const SUB2 = '5b000000-0000-4000-8000-0000005b00e2';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:cashflow-chart] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openCashflowReader.listChart — Drizzle + MySQL (REP · #590 · Slice B)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:cashflow-chart] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // Read-models sem seed de migration → o teste é dono da tabela inteira.
      await handle.db.delete(handle.schema.finPayableView);
      await handle.db.delete(handle.schema.finDocuments);
      // `fin_categories` TÊM seed (migration 0012) — limpar só os ids deste teste, nunca a tabela.
      await handle.db
        .delete(handle.schema.finCategories)
        .where(inArray(handle.schema.finCategories.id, [CAT1, SUB1, SUB2]));
    });

    const payable = (over: {
      payableId: string;
      categoryRef: string | null;
      subcategoryRef: string | null;
      valueCents: number;
      status: string;
      documentId?: string;
      costCenterRef?: string | null;
      dueDate: string;
    }) => ({
      payableId: over.payableId,
      documentId: over.documentId ?? 'dc000000-0000-4000-8000-00000000e001',
      kind: 'Parent',
      supplierRef: null,
      contractRef: null,
      categoryRef: over.categoryRef,
      subcategoryRef: over.subcategoryRef,
      costCenterRef: over.costCenterRef ?? null,
      budgetPlanRef: null,
      programRef: null,
      debitAccountRef: null,
      valueCents: over.valueCents,
      dueDate: over.dueDate,
      status: over.status,
      paidAt: over.status === 'Paid' ? '2026-06-15' : null,
      updatedAt: NOW,
    });

    it('CA: o mês separa as linhas (grão categoria×subcategoria×mês), EXPECTED/REALIZED por mês, ordenado ASC', async () => {
      await handle.db.insert(handle.schema.finCategories).values([
        { id: CAT1, name: 'Aluguel', group: 'despesa', active: true },
        { id: SUB1, name: 'Sala comercial', group: 'despesa', active: true, parentId: CAT1 },
        { id: SUB2, name: 'Depósito', group: 'despesa', active: true, parentId: CAT1 },
      ]);

      await handle.db.insert(handle.schema.finPayableView).values([
        // CAT1/SUB1 — MÊS 2026-02: EXPECTED = Open 100000 + Approved 200000 = 300000; REALIZED = Paid 150000.
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 100000,
          status: 'Open',
          dueDate: '2026-02-05',
        }),
        payable({
          payableId: '21000000-0000-4000-8000-000000000021',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 200000,
          status: 'Approved',
          dueDate: '2026-02-20',
        }),
        payable({
          payableId: '31000000-0000-4000-8000-000000000031',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 150000,
          status: 'Paid',
          dueDate: '2026-02-28',
        }),
        // Cancelled → NUNCA entra.
        payable({
          payableId: '41000000-0000-4000-8000-000000000041',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 999,
          status: 'Cancelled',
          dueDate: '2026-02-10',
        }),
        // CAT1/SUB1 — MÊS 2026-03 (mesma categoria/subcategoria, MÊS diferente → linha própria): Open 40000.
        payable({
          payableId: '51000000-0000-4000-8000-000000000051',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 40000,
          status: 'Open',
          dueDate: '2026-03-15',
        }),
        // CAT1/SUB2 — MÊS 2026-01: Paid 70000.
        payable({
          payableId: '61000000-0000-4000-8000-000000000061',
          categoryRef: CAT1,
          subcategoryRef: SUB2,
          valueCents: 70000,
          status: 'Paid',
          dueDate: '2026-01-09',
        }),
      ]);

      const readerR = await openCashflowReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.listChart();
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      // 3 linhas: (SUB2, 2026-01) + (SUB1, 2026-02) + (SUB1, 2026-03).
      assert.equal(r.value.length, 3);

      // Ordenação por mês ASC: primeiro 2026-01, depois 2026-02, depois 2026-03.
      assert.deepEqual(
        r.value.map((x) => x.installmentsDueDate),
        ['2026-01-01', '2026-02-01', '2026-03-01'],
      );

      const jan = r.value.find((x) => x.installmentsDueDate === '2026-01-01')!;
      assert.equal(jan.subcategoryRef, SUB2);
      assert.equal(jan.subcategoryName, 'Depósito');
      assert.equal(jan.expectedCents, 0);
      assert.equal(jan.realizedCents, 70000);

      const feb = r.value.find((x) => x.installmentsDueDate === '2026-02-01')!;
      assert.equal(feb.subcategoryRef, SUB1);
      assert.equal(feb.categoryName, 'Aluguel');
      assert.equal(feb.expectedCents, 300000, 'Open 100000 + Approved 200000 (Cancelled fora)');
      assert.equal(feb.realizedCents, 150000, 'Paid 150000');

      const mar = r.value.find((x) => x.installmentsDueDate === '2026-03-01')!;
      assert.equal(mar.subcategoryRef, SUB1);
      assert.equal(mar.expectedCents, 40000);
      assert.equal(mar.realizedCents, 0);
    });

    it('CA: filtros restringem a população (janela half-open sobre due_date recorta os meses)', async () => {
      await handle.db.insert(handle.schema.finCategories).values([
        { id: CAT1, name: 'Aluguel', group: 'despesa', active: true },
        { id: SUB1, name: 'Sala comercial', group: 'despesa', active: true, parentId: CAT1 },
      ]);
      await handle.db.insert(handle.schema.finPayableView).values([
        payable({
          payableId: '71000000-0000-4000-8000-000000000071',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 10000,
          status: 'Open',
          dueDate: '2026-01-10',
        }),
        payable({
          payableId: '81000000-0000-4000-8000-000000000081',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 20000,
          status: 'Open',
          dueDate: '2026-02-10',
        }),
        payable({
          payableId: '91000000-0000-4000-8000-000000000091',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 30000,
          status: 'Open',
          dueDate: '2026-03-10',
        }),
      ]);

      const readerR = await openCashflowReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;

      // Janela [2026-02-01, 2026-03-01): só fevereiro sobrevive → 1 linha.
      const r = await reader.listChart({ dueFrom: '2026-02-01', dueTo: '2026-03-01' });
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.value.length, 1);
      assert.equal(r.value[0]!.installmentsDueDate, '2026-02-01');
      assert.equal(r.value[0]!.expectedCents, 20000);
    });
  });
}
