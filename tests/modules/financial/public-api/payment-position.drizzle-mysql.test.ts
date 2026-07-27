/**
 * Integração (REP-4 · #243) — openPaymentPositionReader (financial public-api).
 * Agrega `fin_payable_view` por Fornecedor × Centro de Custo × Categoria em 3 baldes
 * (PENDENTE/PAGO/ATRASADO), com nomes via JOIN. Valida contra MySQL real (OrbStack).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * W0 RED: `openPaymentPositionReader` ainda não existe.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openPaymentPositionReader } from '#src/modules/financial/public-api/payment-position-projection.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  mysqlTestConnectionString();

const S1 = 'aa000000-0000-4000-8000-0000000000a1';
const CC1 = 'cc000000-0000-4000-8000-0000000000c1';
const CAT1 = 'ca000000-0000-4000-8000-0000000000d1';
const NOW = new Date('2026-07-14T12:00:00.000Z'); // hoje = 2026-07-14
const clock = ClockFixed(NOW);

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:payment-position] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openPaymentPositionReader — Drizzle + MySQL (REP-4 · #243)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:payment-position] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // Read-models sem seed de migration → o teste é dono da tabela inteira.
      await handle.db.delete(handle.schema.finPayableView);
      await handle.db.delete(handle.schema.finSupplierView);
      // #588: o filtro de status faz JOIN em fin_documents — dono da tabela inteira na entrada.
      await handle.db.delete(handle.schema.finDocuments);
      // `fin_cost_centers`/`fin_categories` TÊM seed (migrations 0013/0012) do qual outros testes da
      // suíte dependem — limpar só os ids deste teste, nunca a tabela.
      await handle.db
        .delete(handle.schema.finCostCenters)
        .where(inArray(handle.schema.finCostCenters.id, [CC1]));
      await handle.db
        .delete(handle.schema.finCategories)
        .where(inArray(handle.schema.finCategories.id, [CAT1]));
    });

    const payable = (over: {
      payableId: string;
      supplierRef: string | null;
      costCenterRef: string | null;
      categoryRef: string | null;
      valueCents: number;
      status: string;
      dueDate: string;
      paidAt?: string | null;
    }) => ({
      payableId: over.payableId,
      documentId: 'dc000000-0000-4000-8000-00000000d001',
      kind: 'Parent',
      supplierRef: over.supplierRef,
      contractRef: null,
      categoryRef: over.categoryRef,
      costCenterRef: over.costCenterRef,
      valueCents: over.valueCents,
      dueDate: over.dueDate,
      status: over.status,
      paidAt: over.paidAt ?? null,
      updatedAt: NOW,
    });

    it('CA4: 3 baldes por (fornecedor, CC, categoria); Cancelled fora; ATRASADO via ClockFixed; refs nulos agrupam', async () => {
      await handle.db.insert(handle.schema.finSupplierView).values({
        supplierRef: S1,
        name: 'Fornecedor Alpha',
        document: '11222333000181',
        occurredAt: NOW,
        updatedAt: NOW,
      });
      await handle.db
        .insert(handle.schema.finCostCenters)
        .values({ id: CC1, code: 'CC-001', name: 'Administrativo', active: true });
      await handle.db
        .insert(handle.schema.finCategories)
        .values({ id: CAT1, name: 'Aluguel', group: 'despesa', active: true });

      await handle.db.insert(handle.schema.finPayableView).values([
        // grupo S1/CC1/CAT1: PENDENTE(Open, futuro) + PENDENTE&ATRASADO(Approved, passado) + PAGO
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          supplierRef: S1,
          costCenterRef: CC1,
          categoryRef: CAT1,
          valueCents: 100000,
          status: 'Open',
          dueDate: '2026-08-01',
        }),
        payable({
          payableId: '21000000-0000-4000-8000-000000000021',
          supplierRef: S1,
          costCenterRef: CC1,
          categoryRef: CAT1,
          valueCents: 200000,
          status: 'Approved',
          dueDate: '2026-07-01',
        }),
        payable({
          payableId: '31000000-0000-4000-8000-000000000031',
          supplierRef: S1,
          costCenterRef: CC1,
          categoryRef: CAT1,
          valueCents: 150000,
          status: 'Paid',
          dueDate: '2026-06-01',
          paidAt: '2026-06-15',
        }),
        // vence HOJE (Open) → PENDENTE, mas NÃO ATRASADO (predicado é `< hoje`, estrito)
        payable({
          payableId: '61000000-0000-4000-8000-000000000061',
          supplierRef: S1,
          costCenterRef: CC1,
          categoryRef: CAT1,
          valueCents: 10000,
          status: 'Open',
          dueDate: '2026-07-14',
        }),
        // Cancelled → excluído
        payable({
          payableId: '41000000-0000-4000-8000-000000000041',
          supplierRef: S1,
          costCenterRef: CC1,
          categoryRef: CAT1,
          valueCents: 999,
          status: 'Cancelled',
          dueDate: '2026-01-01',
        }),
        // grupo (null,null,null): Open, passado → pending+overdue
        payable({
          payableId: '51000000-0000-4000-8000-000000000051',
          supplierRef: null,
          costCenterRef: null,
          categoryRef: null,
          valueCents: 5000,
          status: 'Open',
          dueDate: '2026-07-01',
        }),
      ]);

      const readerR = await openPaymentPositionReader({ connectionString, clock });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list();
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.value.length, 2, 'grupo S1/CC1/CAT1 + grupo nulo');

      const g1 = r.value.find((x) => x.supplierRef === S1)!;
      assert.equal(g1.supplierName, 'Fornecedor Alpha');
      assert.equal(g1.costCenterName, 'Administrativo');
      assert.equal(g1.categoryName, 'Aluguel');
      assert.equal(
        g1.pendingCents,
        310000,
        'Open 100000 + Approved 200000 + Open-vence-hoje 10000',
      );
      assert.equal(g1.paidCents, 150000);
      assert.equal(
        g1.overdueCents,
        200000,
        'só o Approved com due_date < hoje (o que vence hoje NÃO é atrasado)',
      );

      const g2 = r.value.find((x) => x.supplierRef === null)!;
      assert.equal(g2.costCenterRef, null);
      assert.equal(g2.categoryName, null);
      assert.equal(g2.pendingCents, 5000);
      assert.equal(g2.paidCents, 0);
      assert.equal(g2.overdueCents, 5000);
    });

    // #588 — cada filtro restringe a população (AND); `status` discrimina via JOIN em fin_documents.
    it('CA5: cada um dos 8 filtros restringe; combinação é AND; status granular via fin_documents', async () => {
      // Eixos: A = "casa o filtro positivo"; B = distrator (difere em UM eixo).
      const A = {
        sup: 'aa000000-0000-4000-8000-00000000a0a1',
        cc: 'cc000000-0000-4000-8000-0000000cc0a1',
        cat: 'ca000000-0000-4000-8000-0000000ca0a1',
        sub: '5b000000-0000-4000-8000-0000005b00a1',
        plan: 'b0000000-0000-4000-8000-00000000b0a1',
        ced: 'ce000000-0000-4000-8000-0000000ce0a1',
      };
      const B = {
        sup: 'aa000000-0000-4000-8000-00000000b0b1',
        cc: 'cc000000-0000-4000-8000-0000000cc0b1',
        cat: 'ca000000-0000-4000-8000-0000000ca0b1',
        sub: '5b000000-0000-4000-8000-0000005b00b1',
        plan: 'b0000000-0000-4000-8000-00000000b0b1',
        ced: 'ce000000-0000-4000-8000-0000000ce0b1',
      };
      const DOC_RECON = 'd0000000-0000-4000-8000-00000000dc01'; // status vivo Reconciled
      const DOC_PAID = 'd0000000-0000-4000-8000-00000000dc02'; // status vivo Paid
      const DUE = '2026-03-15'; // dentro da janela [2026-01-01, 2026-07-01)
      const DUE_BEFORE = '2025-12-01';
      const DUE_AFTER = '2026-08-01';

      await handle.db.insert(handle.schema.finDocuments).values([
        { id: DOC_RECON, status: 'Reconciled', createdAt: NOW },
        { id: DOC_PAID, status: 'Paid', createdAt: NOW },
      ]);

      // Builder: todas as medidas caem no balde PENDENTE (view status 'Open'), value 100000 —
      // somar pendingCents das rows devolvidas conta quantos payables o filtro deixou passar.
      let seq = 0;
      const pv = (
        over: Partial<{
          supplierRef: string;
          costCenterRef: string;
          categoryRef: string;
          subcategoryRef: string;
          budgetPlanRef: string;
          debitAccountRef: string;
          documentId: string;
          dueDate: string;
        }>,
      ) => {
        seq += 1;
        const n = seq.toString(16).padStart(2, '0');
        return {
          payableId: `f0000000-0000-4000-8000-0000000000${n}`,
          documentId: over.documentId ?? DOC_RECON,
          kind: 'Parent',
          supplierRef: over.supplierRef ?? A.sup,
          contractRef: null,
          categoryRef: over.categoryRef ?? A.cat,
          budgetPlanRef: over.budgetPlanRef ?? A.plan,
          subcategoryRef: over.subcategoryRef ?? A.sub,
          costCenterRef: over.costCenterRef ?? A.cc,
          debitAccountRef: over.debitAccountRef ?? A.ced,
          valueCents: 100000,
          dueDate: over.dueDate ?? DUE,
          status: 'Open',
          paidAt: null,
          updatedAt: NOW,
        };
      };

      await handle.db.insert(handle.schema.finPayableView).values([
        pv({}), // P_MATCH — casa todos os filtros positivos
        pv({ supplierRef: B.sup }), // distrator de supplier
        pv({ costCenterRef: B.cc }), // distrator de cost center
        pv({ categoryRef: B.cat }), // distrator de category
        pv({ subcategoryRef: B.sub }), // distrator de subcategory
        pv({ budgetPlanRef: B.plan }), // distrator de budget plan
        pv({ debitAccountRef: B.ced }), // distrator de cedente (debit_account_ref)
        pv({ documentId: DOC_PAID }), // distrator de status (doc Paid, não Reconciled)
        pv({ dueDate: DUE_BEFORE }), // antes da janela
        pv({ dueDate: DUE_AFTER }), // depois da janela (half-open exclui o próprio dueTo)
      ]);

      const readerR = await openPaymentPositionReader({ connectionString, clock });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;

      const sumPending = async (filter?: Parameters<typeof reader.list>[0]) => {
        const r = await reader.list(filter);
        assert.equal(r.ok, true, JSON.stringify(r));
        if (!r.ok) return -1;
        return r.value.reduce((acc, x) => acc + x.pendingCents, 0);
      };

      // Baseline: 10 payables × 100000.
      assert.equal(await sumPending(), 1_000_000, 'sem filtro: 10 payables');

      // Cada filtro positivo exclui exatamente o seu distrator → 9 payables.
      assert.equal(await sumPending({ supplierRef: A.sup }), 900_000, 'supplierRef restringe');
      assert.equal(await sumPending({ costCenterRef: A.cc }), 900_000, 'costCenterRef restringe');
      assert.equal(await sumPending({ categoryRef: A.cat }), 900_000, 'categoryRef restringe');
      assert.equal(
        await sumPending({ subcategoryRef: A.sub }),
        900_000,
        'subcategoryRef restringe',
      );
      assert.equal(await sumPending({ budgetPlanRef: A.plan }), 900_000, 'budgetPlanRef restringe');
      assert.equal(
        await sumPending({ cedenteAccountRef: A.ced }),
        900_000,
        'cedenteAccountRef → debit_account_ref restringe',
      );

      // status granular via JOIN em fin_documents: Reconciled (9 docs) vs Paid (1 doc) discrimina.
      assert.equal(
        await sumPending({ status: 'Reconciled' }),
        900_000,
        'status=Reconciled exclui o payable do documento Paid',
      );
      assert.equal(
        await sumPending({ status: 'Paid' }),
        100_000,
        'status=Paid isola só o payable do documento Paid (o view status não distingue isso)',
      );
      assert.equal(
        await sumPending({ status: 'Transmitted' }),
        0,
        'status=Transmitted: nenhum documento com esse status vivo',
      );

      // Janela half-open [dueFrom, dueTo): exclui o de antes e o de depois → 8 payables.
      assert.equal(
        await sumPending({ dueFrom: '2026-01-01', dueTo: '2026-07-01' }),
        800_000,
        'janela de vencimento half-open restringe',
      );

      // Combinação = AND: todos os filtros positivos juntos → só P_MATCH sobrevive.
      assert.equal(
        await sumPending({
          supplierRef: A.sup,
          costCenterRef: A.cc,
          categoryRef: A.cat,
          subcategoryRef: A.sub,
          budgetPlanRef: A.plan,
          cedenteAccountRef: A.ced,
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
