/**
 * Integração (REP-2 · #240) — openSuppliersWithoutContractReader (financial public-api).
 * Agrega `fin_payable_view` WHERE `contract_ref IS NULL` AND `supplier_ref IS NOT NULL` por
 * fornecedor (SUM value_cents, COUNT), LEFT JOIN `fin_supplier_view` p/ o nome. Valida contra
 * MySQL real (OrbStack) — o que o driver `memory` não cobre.
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * W0 RED: `openSuppliersWithoutContractReader` ainda não existe.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openSuppliersWithoutContractReader } from '#src/modules/financial/public-api/suppliers-without-contract-projection.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  mysqlTestConnectionString();

const S1 = 'aa000000-0000-4000-8000-0000000000a1';
const S2 = 'bb000000-0000-4000-8000-0000000000b2';
const NOW = new Date('2026-07-01T12:00:00.000Z');

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:suppliers-without-contract] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openSuppliersWithoutContractReader — Drizzle + MySQL (REP-2 · #240)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:suppliers-without-contract] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // Agregação de estado absoluto → dono das próprias precondições (limpa as duas views).
      await handle.db.delete(handle.schema.finPayableView);
      await handle.db.delete(handle.schema.finSupplierView);
    });

    const payable = (over: {
      payableId: string;
      supplierRef: string | null;
      contractRef: string | null;
      valueCents: number;
      status: string;
      kind?: 'Parent' | 'Child';
      retentionType?: string;
      budgetPlanRef?: string | null;
      programRef?: string | null;
      categoryRef?: string | null;
      dueDate?: string;
    }) => ({
      payableId: over.payableId,
      documentId: 'dc000000-0000-4000-8000-00000000d001',
      kind: over.kind ?? 'Parent',
      // CHECK da view: `(kind='Child') = (retention_type IS NOT NULL)`. Child exige tipo; Parent, null.
      retentionType: over.kind === 'Child' ? (over.retentionType ?? 'ISS') : null,
      supplierRef: over.supplierRef,
      contractRef: over.contractRef,
      budgetPlanRef: over.budgetPlanRef ?? null,
      programRef: over.programRef ?? null,
      categoryRef: over.categoryRef ?? null,
      valueCents: over.valueCents,
      dueDate: over.dueDate ?? '2026-08-01',
      status: over.status,
      updatedAt: NOW,
    });

    it('CA4: agrega por fornecedor (contract_ref IS NULL, todos os status), nome via LEFT JOIN', async () => {
      await handle.db.insert(handle.schema.finSupplierView).values({
        supplierRef: S1,
        name: 'Fornecedor Alpha',
        document: '11222333000181',
        occurredAt: NOW,
        updatedAt: NOW,
      });
      await handle.db.insert(handle.schema.finPayableView).values([
        // S1 sem contrato: Open + Cancelled → conta os DOIS (todos os status), soma 150000
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          supplierRef: S1,
          contractRef: null,
          valueCents: 100000,
          status: 'Open',
        }),
        payable({
          payableId: '21000000-0000-4000-8000-000000000021',
          supplierRef: S1,
          contractRef: null,
          valueCents: 50000,
          status: 'Cancelled',
        }),
        // S1 COM contrato → excluído
        payable({
          payableId: '31000000-0000-4000-8000-000000000031',
          supplierRef: S1,
          contractRef: '99000000-0000-4000-8000-000000009901',
          valueCents: 999,
          status: 'Open',
        }),
        // S2 sem contrato, sem linha em supplier_view → incluído, name null
        payable({
          payableId: '41000000-0000-4000-8000-000000000041',
          supplierRef: S2,
          contractRef: null,
          valueCents: 7000,
          status: 'Paid',
        }),
        // supplier_ref null → excluído
        payable({
          payableId: '51000000-0000-4000-8000-000000000051',
          supplierRef: null,
          contractRef: null,
          valueCents: 123,
          status: 'Open',
        }),
      ]);

      const readerR = await openSuppliersWithoutContractReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list();
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      const byRef = new Map(r.value.map((s) => [s.supplierRef, s]));
      assert.equal(byRef.size, 2, 'só S1 e S2 (S com contrato e null-supplier fora)');

      const s1 = byRef.get(S1)!;
      assert.equal(s1.name, 'Fornecedor Alpha');
      assert.equal(s1.totalCents, 150000, 'soma inclui Cancelled');
      assert.equal(s1.payableCount, 2);

      const s2 = byRef.get(S2)!;
      assert.equal(s2.name, null, 'sem projeção em fin_supplier_view → null');
      assert.equal(s2.totalCents, 7000);
      assert.equal(s2.payableCount, 1);
    });

    it('#437 (bruto): filhos de retenção (Child) ENTRAM na soma e na contagem', async () => {
      await handle.db.insert(handle.schema.finSupplierView).values({
        supplierRef: S1,
        name: 'Fornecedor Alpha',
        document: '11222333000181',
        occurredAt: NOW,
        updatedAt: NOW,
      });
      // 1 NFS-e sem contrato: pai (líquido) + filho de retenção ISS — ambos do mesmo fornecedor.
      await handle.db.insert(handle.schema.finPayableView).values([
        payable({
          payableId: 'a1000000-0000-4000-8000-0000000000a1',
          supplierRef: S1,
          contractRef: null,
          valueCents: 90000, // líquido ao fornecedor
          status: 'Open',
        }),
        payable({
          payableId: 'a2000000-0000-4000-8000-0000000000a2',
          supplierRef: S1,
          contractRef: null,
          valueCents: 10000, // retenção ISS
          status: 'Open',
          kind: 'Child',
          retentionType: 'ISS',
        }),
      ]);

      const readerR = await openSuppliersWithoutContractReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list();
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      const s1 = r.value.find((s) => s.supplierRef === S1)!;
      // BRUTO (decisão de auditoria da P.O., #437): pai + filho de retenção.
      assert.equal(s1.totalCents, 100000, '90000 (pai) + 10000 (retenção ISS) = bruto');
      assert.equal(s1.payableCount, 2, 'pai e filho contam');
    });

    it('#694: quebra por Plano Orçamentário (uma linha por fornecedor×plano) + filtros recortam', async () => {
      const PLAN_A = '10000000-0000-4000-8000-0000000000a0';
      const PLAN_B = '20000000-0000-4000-8000-0000000000b0';
      const PROG_1 = '30000000-0000-4000-8000-000000000c10';
      await handle.db.insert(handle.schema.finSupplierView).values({
        supplierRef: S1,
        name: 'Fornecedor Alpha',
        document: '11222333000181',
        occurredAt: NOW,
        updatedAt: NOW,
      });
      // Mesmo fornecedor S1, dois planos (ambos sem contrato) → duas linhas.
      await handle.db.insert(handle.schema.finPayableView).values([
        payable({
          payableId: 'c1000000-0000-4000-8000-0000000000c1',
          supplierRef: S1,
          contractRef: null,
          budgetPlanRef: PLAN_A,
          programRef: PROG_1,
          valueCents: 100000,
          status: 'Open',
        }),
        payable({
          payableId: 'c2000000-0000-4000-8000-0000000000c2',
          supplierRef: S1,
          contractRef: null,
          budgetPlanRef: PLAN_B,
          valueCents: 40000,
          status: 'Open',
        }),
      ]);

      const readerR = await openSuppliersWithoutContractReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;

      // Sem filtro: duas linhas (S1×PLAN_A e S1×PLAN_B), o supplierRef repetido.
      const all = await reader.list();
      assert.equal(all.ok, true, JSON.stringify(all));
      if (!all.ok) return;
      const s1Rows = all.value.filter((r) => r.supplierRef === S1);
      assert.equal(s1Rows.length, 2, 'uma linha por plano');
      const byPlan = new Map(s1Rows.map((r) => [r.budgetPlanRef, r]));
      assert.equal(byPlan.get(PLAN_A)!.totalCents, 100000);
      assert.equal(byPlan.get(PLAN_B)!.totalCents, 40000);

      // Filtro por plano: só a linha do PLAN_A.
      const filtered = await reader.list({ budgetPlanRef: PLAN_A });
      assert.equal(filtered.ok, true, JSON.stringify(filtered));
      if (!filtered.ok) return;
      const f = filtered.value.filter((r) => r.supplierRef === S1);
      assert.equal(f.length, 1);
      assert.equal(f[0]!.budgetPlanRef, PLAN_A);
      assert.equal(f[0]!.totalCents, 100000);

      // Filtro por programa: só a linha carimbada com PROG_1 (o PLAN_A).
      const byProgram = await reader.list({ programRef: PROG_1 });
      assert.equal(byProgram.ok, true, JSON.stringify(byProgram));
      if (byProgram.ok) {
        const p = byProgram.value.filter((r) => r.supplierRef === S1);
        assert.equal(p.length, 1);
        assert.equal(p[0]!.totalCents, 100000);
      }
      await reader.close();
    });
  });
}
