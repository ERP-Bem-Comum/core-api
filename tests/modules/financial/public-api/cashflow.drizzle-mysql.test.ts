/**
 * Integração (REP · #590 · Slice A) — openCashflowReader (financial public-api).
 * Agrega `fin_payable_view` por Categoria × Subcategoria em 2 baldes:
 *  - EXPECTED = Σ(value_cents) WHERE status IN ('Open','Approved')
 *  - REALIZED = Σ(value_cents) WHERE status = 'Paid'
 * `Cancelled` sempre fora. Valida contra MySQL real (OrbStack).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * W0 RED: `openCashflowReader` ainda não existe.
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

// Taxonomia: CAT1 é a categoria; SUB1/SUB2 são subcategorias (folhas auto-referentes por parent_id).
const CAT1 = 'ca000000-0000-4000-8000-0000000000d1';
const SUB1 = '5b000000-0000-4000-8000-0000005b00d1';
const SUB2 = '5b000000-0000-4000-8000-0000005b00d2';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:cashflow] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openCashflowReader — Drizzle + MySQL (REP · #590 · Slice A)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:cashflow] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // Read-models sem seed de migration → o teste é dono da tabela inteira.
      await handle.db.delete(handle.schema.finPayableView);
      // O filtro de status faz JOIN em fin_documents — dono da tabela inteira na entrada.
      await handle.db.delete(handle.schema.finDocuments);
      // `fin_categories` TÊM seed (migration 0012) do qual outros testes dependem — limpar só os ids
      // deste teste, nunca a tabela.
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
      programRef?: string | null;
      budgetPlanRef?: string | null;
      costCenterRef?: string | null;
      debitAccountRef?: string | null;
      supplierRef?: string | null;
      dueDate?: string;
    }) => ({
      payableId: over.payableId,
      documentId: over.documentId ?? 'dc000000-0000-4000-8000-00000000d001',
      kind: 'Parent',
      supplierRef: over.supplierRef ?? null,
      contractRef: null,
      categoryRef: over.categoryRef,
      subcategoryRef: over.subcategoryRef,
      costCenterRef: over.costCenterRef ?? null,
      budgetPlanRef: over.budgetPlanRef ?? null,
      programRef: over.programRef ?? null,
      debitAccountRef: over.debitAccountRef ?? null,
      valueCents: over.valueCents,
      dueDate: over.dueDate ?? '2026-07-01',
      status: over.status,
      paidAt: over.status === 'Paid' ? '2026-06-15' : null,
      updatedAt: NOW,
    });

    it('CA: EXPECTED=Σ(Open+Approved), REALIZED=Σ(Paid), Cancelled fora, grão categoria×subcategoria', async () => {
      await handle.db.insert(handle.schema.finCategories).values([
        { id: CAT1, name: 'Aluguel', group: 'despesa', active: true },
        { id: SUB1, name: 'Sala comercial', group: 'despesa', active: true, parentId: CAT1 },
        { id: SUB2, name: 'Depósito', group: 'despesa', active: true, parentId: CAT1 },
      ]);

      await handle.db.insert(handle.schema.finPayableView).values([
        // grupo CAT1/SUB1: EXPECTED = Open 100000 + Approved 200000 = 300000; REALIZED = Paid 150000.
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 100000,
          status: 'Open',
        }),
        payable({
          payableId: '21000000-0000-4000-8000-000000000021',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 200000,
          status: 'Approved',
        }),
        payable({
          payableId: '31000000-0000-4000-8000-000000000031',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 150000,
          status: 'Paid',
        }),
        // Cancelled → NUNCA entra em nenhum balde.
        payable({
          payableId: '41000000-0000-4000-8000-000000000041',
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 999,
          status: 'Cancelled',
        }),
        // grupo CAT1/SUB2: só REALIZED (Paid 70000).
        payable({
          payableId: '51000000-0000-4000-8000-000000000051',
          categoryRef: CAT1,
          subcategoryRef: SUB2,
          valueCents: 70000,
          status: 'Paid',
        }),
        // grupo (null, null): EXPECTED = Open 5000.
        payable({
          payableId: '61000000-0000-4000-8000-000000000061',
          categoryRef: null,
          subcategoryRef: null,
          valueCents: 5000,
          status: 'Open',
        }),
      ]);

      const readerR = await openCashflowReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list();
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.value.length, 3, 'CAT1/SUB1 + CAT1/SUB2 + grupo nulo');

      const g1 = r.value.find((x) => x.subcategoryRef === SUB1)!;
      assert.equal(g1.categoryName, 'Aluguel');
      assert.equal(g1.subcategoryName, 'Sala comercial');
      assert.equal(g1.expectedCents, 300000, 'Open 100000 + Approved 200000 (Cancelled fora)');
      assert.equal(g1.realizedCents, 150000, 'Paid 150000');

      const g2 = r.value.find((x) => x.subcategoryRef === SUB2)!;
      assert.equal(g2.subcategoryName, 'Depósito');
      assert.equal(g2.expectedCents, 0);
      assert.equal(g2.realizedCents, 70000);

      const g3 = r.value.find((x) => x.subcategoryRef === null)!;
      assert.equal(g3.categoryRef, null);
      assert.equal(g3.categoryName, null);
      assert.equal(g3.expectedCents, 5000);
      assert.equal(g3.realizedCents, 0);
    });

    it('CA: cada filtro restringe a população (AND); status granular via fin_documents', async () => {
      const A = {
        program: 'a0000000-0000-4000-8000-00000000a0a1',
        budgetPlan: 'b0000000-0000-4000-8000-00000000b0a1',
        account: 'ce000000-0000-4000-8000-0000000ce0a1',
        costCenter: 'cc000000-0000-4000-8000-0000000cc0a1',
        supplier: 'aa000000-0000-4000-8000-00000000a0a1',
      };
      const B = {
        program: 'a0000000-0000-4000-8000-00000000b0b1',
        budgetPlan: 'b0000000-0000-4000-8000-00000000b0b1',
        account: 'ce000000-0000-4000-8000-0000000ce0b1',
        costCenter: 'cc000000-0000-4000-8000-0000000cc0b1',
        supplier: 'aa000000-0000-4000-8000-00000000b0b1',
      };
      const DOC_RECON = 'd0000000-0000-4000-8000-00000000dc01'; // status vivo Reconciled
      const DOC_PAID = 'd0000000-0000-4000-8000-00000000dc02'; // status vivo Paid
      const DUE = '2026-03-15';
      const DUE_BEFORE = '2025-12-01';
      const DUE_AFTER = '2026-08-01';

      await handle.db.insert(handle.schema.finCategories).values([
        { id: CAT1, name: 'Aluguel', group: 'despesa', active: true },
        { id: SUB1, name: 'Sala comercial', group: 'despesa', active: true, parentId: CAT1 },
      ]);
      await handle.db.insert(handle.schema.finDocuments).values([
        { id: DOC_RECON, status: 'Reconciled', createdAt: NOW },
        { id: DOC_PAID, status: 'Paid', createdAt: NOW },
      ]);

      // Todas as medidas caem no balde EXPECTED (view status 'Open'), value 100000 — somar
      // expectedCents das rows devolvidas conta quantos payables o filtro deixou passar.
      let seq = 0;
      const pv = (
        over: Partial<{
          programRef: string;
          budgetPlanRef: string;
          debitAccountRef: string;
          costCenterRef: string;
          supplierRef: string;
          documentId: string;
          dueDate: string;
        }>,
      ) => {
        seq += 1;
        const n = seq.toString(16).padStart(2, '0');
        return payable({
          payableId: `f0000000-0000-4000-8000-0000000000${n}`,
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          valueCents: 100000,
          status: 'Open',
          documentId: over.documentId ?? DOC_RECON,
          programRef: over.programRef ?? A.program,
          budgetPlanRef: over.budgetPlanRef ?? A.budgetPlan,
          debitAccountRef: over.debitAccountRef ?? A.account,
          costCenterRef: over.costCenterRef ?? A.costCenter,
          supplierRef: over.supplierRef ?? A.supplier,
          dueDate: over.dueDate ?? DUE,
        });
      };

      await handle.db.insert(handle.schema.finPayableView).values([
        pv({}), // P_MATCH — casa todos os filtros positivos
        pv({ programRef: B.program }),
        pv({ budgetPlanRef: B.budgetPlan }),
        pv({ debitAccountRef: B.account }),
        pv({ costCenterRef: B.costCenter }),
        pv({ supplierRef: B.supplier }),
        pv({ documentId: DOC_PAID }), // distrator de status (doc Paid, não Reconciled)
        pv({ dueDate: DUE_BEFORE }),
        pv({ dueDate: DUE_AFTER }),
      ]);

      const readerR = await openCashflowReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;

      const sumExpected = async (filter?: Parameters<typeof reader.list>[0]) => {
        const r = await reader.list(filter);
        assert.equal(r.ok, true, JSON.stringify(r));
        if (!r.ok) return -1;
        return r.value.reduce((acc, x) => acc + x.expectedCents, 0);
      };

      assert.equal(await sumExpected(), 900_000, 'sem filtro: 9 payables');
      assert.equal(await sumExpected({ programRef: A.program }), 800_000, 'programRef restringe');
      assert.equal(
        await sumExpected({ budgetPlanRef: A.budgetPlan }),
        800_000,
        'budgetPlanRef restringe',
      );
      assert.equal(
        await sumExpected({ debitAccountRef: A.account }),
        800_000,
        'debitAccountRef restringe',
      );
      assert.equal(
        await sumExpected({ costCenterRef: A.costCenter }),
        800_000,
        'costCenterRef restringe (filtra população mesmo sem ser eixo)',
      );
      assert.equal(
        await sumExpected({ supplierRef: A.supplier }),
        800_000,
        'supplierRef restringe',
      );
      assert.equal(await sumExpected({ categoryRef: CAT1 }), 900_000, 'categoryRef casa todos');
      assert.equal(
        await sumExpected({ subcategoryRef: SUB1 }),
        900_000,
        'subcategoryRef casa todos',
      );

      // status granular via JOIN em fin_documents: Reconciled (8 docs) vs Paid (1 doc).
      assert.equal(
        await sumExpected({ status: 'Reconciled' }),
        800_000,
        'status=Reconciled exclui o payable do documento Paid',
      );
      assert.equal(
        await sumExpected({ status: 'Paid' }),
        100_000,
        'status=Paid isola só o payable do documento Paid',
      );

      // Janela half-open [dueFrom, dueTo): exclui o de antes e o de depois → 7 payables.
      assert.equal(
        await sumExpected({ dueFrom: '2026-01-01', dueTo: '2026-07-01' }),
        700_000,
        'janela de vencimento half-open restringe',
      );

      // Combinação = AND: todos os filtros positivos → só P_MATCH sobrevive.
      assert.equal(
        await sumExpected({
          programRef: A.program,
          budgetPlanRef: A.budgetPlan,
          debitAccountRef: A.account,
          costCenterRef: A.costCenter,
          supplierRef: A.supplier,
          status: 'Reconciled',
          dueFrom: '2026-01-01',
          dueTo: '2026-07-01',
        }),
        100_000,
        'AND de todos os filtros → interseção = 1 payable',
      );

      await reader.close();
    });
  });
}
