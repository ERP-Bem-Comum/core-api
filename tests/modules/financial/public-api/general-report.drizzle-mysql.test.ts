/**
 * Integração (REP-6 · #442 · Slice A) — openGeneralReportReader (financial public-api).
 * Linhas PLANAS PAGINADAS de `fin_payable_view`, com colunas servíveis via LEFT JOIN same-module
 * (fin_documents.document_number, fin_supplier_view.name, fin_cost_centers.name, fin_categories
 * por category_ref + SELF-JOIN por subcategory_ref). Valida contra MySQL real (OrbStack).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openGeneralReportReader } from '#src/modules/financial/public-api/general-report-projection.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  mysqlTestConnectionString();

const S1 = 'aa000000-0000-4000-8000-0000000000a1';
const CC1 = 'cc000000-0000-4000-8000-0000000000c1';
const CAT1 = 'ca000000-0000-4000-8000-0000000000d1';
const SUB1 = 'ca000000-0000-4000-8000-0000000000e1'; // subcategoria = folha (parent_id = CAT1)
const DOC1 = 'dc000000-0000-4000-8000-00000000d001';
const NOW = new Date('2026-07-14T12:00:00.000Z');

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:general-report] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openGeneralReportReader — Drizzle + MySQL (REP-6 · #442 · Slice A)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:general-report] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // Read-models sem seed → dono da tabela inteira na entrada.
      await handle.db.delete(handle.schema.finPayableView);
      await handle.db.delete(handle.schema.finSupplierView);
      await handle.db.delete(handle.schema.finDocuments);
      // fin_cost_centers/fin_categories TÊM seed (migrations) — limpar só os ids deste teste.
      await handle.db
        .delete(handle.schema.finCostCenters)
        .where(inArray(handle.schema.finCostCenters.id, [CC1]));
      await handle.db
        .delete(handle.schema.finCategories)
        .where(inArray(handle.schema.finCategories.id, [CAT1, SUB1]));
    });

    const payable = (over: {
      payableId: string;
      documentId?: string;
      supplierRef?: string | null;
      costCenterRef?: string | null;
      categoryRef?: string | null;
      subcategoryRef?: string | null;
      contractRef?: string | null;
      programRef?: string | null;
      budgetPlanRef?: string | null;
      debitAccountRef?: string | null;
      valueCents: number;
      status: string;
      dueDate: string;
    }) => ({
      payableId: over.payableId,
      documentId: over.documentId ?? DOC1,
      kind: 'Parent',
      supplierRef: over.supplierRef ?? null,
      contractRef: over.contractRef ?? null,
      categoryRef: over.categoryRef ?? null,
      subcategoryRef: over.subcategoryRef ?? null,
      budgetPlanRef: over.budgetPlanRef ?? null,
      programRef: over.programRef ?? null,
      costCenterRef: over.costCenterRef ?? null,
      debitAccountRef: over.debitAccountRef ?? null,
      valueCents: over.valueCents,
      dueDate: over.dueDate,
      status: over.status,
      paidAt: null,
      updatedAt: NOW,
    });

    it('CA1: linha plana com nomes por JOIN (fornecedor/CC/categoria/subcategoria); Cancelled fora', async () => {
      await handle.db.insert(handle.schema.finDocuments).values({
        id: DOC1,
        documentNumber: 'NFS 1234',
        status: 'Open',
        createdAt: NOW,
      });
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
      await handle.db.insert(handle.schema.finCategories).values([
        { id: CAT1, name: 'Aluguel', group: 'despesa', active: true },
        { id: SUB1, name: 'Aluguel Sede', group: 'despesa', active: true, parentId: CAT1 },
      ]);

      await handle.db.insert(handle.schema.finPayableView).values([
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          supplierRef: S1,
          costCenterRef: CC1,
          categoryRef: CAT1,
          subcategoryRef: SUB1,
          contractRef: '55555555-5555-4555-8555-555555555555',
          valueCents: 300000,
          status: 'Open',
          dueDate: '2026-07-01',
        }),
        // Cancelled → excluído
        payable({
          payableId: '41000000-0000-4000-8000-000000000041',
          supplierRef: S1,
          valueCents: 999,
          status: 'Cancelled',
          dueDate: '2026-01-01',
        }),
      ]);

      const readerR = await openGeneralReportReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list({}, { page: 1, limit: 50 });
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.value.total, 1, 'Cancelled fora');
      assert.equal(r.value.items.length, 1);
      const line = r.value.items[0]!;
      assert.equal(line.code, 'NFS 1234');
      assert.equal(line.tipo, 'a-pagar');
      assert.equal(line.supplierName, 'Fornecedor Alpha');
      assert.equal(line.costCenterName, 'Administrativo');
      assert.equal(line.categoryName, 'Aluguel');
      assert.equal(
        line.subcategoryName,
        'Aluguel Sede',
        'self-join da taxonomia por subcategory_ref',
      );
      assert.equal(line.valueCents, 300000);
      assert.equal(line.contractRef, '55555555-5555-4555-8555-555555555555');
    });

    it('CA2: refs nulos → nomes null (degradação graciosa), não somem da página', async () => {
      await handle.db.insert(handle.schema.finDocuments).values({
        id: DOC1,
        documentNumber: null,
        status: 'Open',
        createdAt: NOW,
      });
      await handle.db.insert(handle.schema.finPayableView).values(
        payable({
          payableId: '51000000-0000-4000-8000-000000000051',
          valueCents: 5000,
          status: 'Open',
          dueDate: '2026-07-01',
        }),
      );

      const readerR = await openGeneralReportReader({ connectionString });
      if (!readerR.ok) return assert.fail(JSON.stringify(readerR));
      const reader = readerR.value;
      const r = await reader.list({}, { page: 1, limit: 50 });
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.value.items.length, 1);
      const line = r.value.items[0]!;
      assert.equal(line.code, null);
      assert.equal(line.supplierName, null);
      assert.equal(line.costCenterName, null);
      assert.equal(line.categoryName, null);
      assert.equal(line.subcategoryName, null);
      assert.equal(line.contractRef, null);
    });

    it('CA3: cada filtro restringe; combinação é AND; status granular via fin_documents', async () => {
      const A = {
        sup: 'aa000000-0000-4000-8000-00000000a0a1',
        cc: 'cc000000-0000-4000-8000-0000000cc0a1',
        cat: 'ca000000-0000-4000-8000-0000000ca0a1',
        sub: '5b000000-0000-4000-8000-0000005b00a1',
        plan: 'b0000000-0000-4000-8000-00000000b0a1',
        prog: 'a0000000-0000-4000-8000-00000000a00a',
        ced: 'ce000000-0000-4000-8000-0000000ce0a1',
      };
      const B = {
        sup: 'aa000000-0000-4000-8000-00000000b0b1',
        cc: 'cc000000-0000-4000-8000-0000000cc0b1',
        cat: 'ca000000-0000-4000-8000-0000000ca0b1',
        sub: '5b000000-0000-4000-8000-0000005b00b1',
        plan: 'b0000000-0000-4000-8000-00000000b0b1',
        prog: 'a0000000-0000-4000-8000-00000000b00b',
        ced: 'ce000000-0000-4000-8000-0000000ce0b1',
      };
      const DOC_RECON = 'd0000000-0000-4000-8000-00000000dc01';
      const DOC_PAID = 'd0000000-0000-4000-8000-00000000dc02';
      const DUE = '2026-03-15';
      const DUE_BEFORE = '2025-12-01';
      const DUE_AFTER = '2026-08-01';

      await handle.db.insert(handle.schema.finDocuments).values([
        { id: DOC_RECON, status: 'Reconciled', createdAt: NOW },
        { id: DOC_PAID, status: 'Paid', createdAt: NOW },
      ]);

      let seq = 0;
      const pv = (
        over: Partial<{
          supplierRef: string;
          costCenterRef: string;
          categoryRef: string;
          subcategoryRef: string;
          budgetPlanRef: string;
          programRef: string;
          debitAccountRef: string;
          documentId: string;
          dueDate: string;
        }>,
      ) => {
        seq += 1;
        const n = seq.toString(16).padStart(2, '0');
        return payable({
          payableId: `f0000000-0000-4000-8000-0000000000${n}`,
          documentId: over.documentId ?? DOC_RECON,
          supplierRef: over.supplierRef ?? A.sup,
          categoryRef: over.categoryRef ?? A.cat,
          subcategoryRef: over.subcategoryRef ?? A.sub,
          budgetPlanRef: over.budgetPlanRef ?? A.plan,
          programRef: over.programRef ?? A.prog,
          costCenterRef: over.costCenterRef ?? A.cc,
          debitAccountRef: over.debitAccountRef ?? A.ced,
          valueCents: 100000,
          dueDate: over.dueDate ?? DUE,
          status: 'Open',
        });
      };

      await handle.db.insert(handle.schema.finPayableView).values([
        pv({}), // P_MATCH
        pv({ supplierRef: B.sup }),
        pv({ costCenterRef: B.cc }),
        pv({ categoryRef: B.cat }),
        pv({ subcategoryRef: B.sub }),
        pv({ budgetPlanRef: B.plan }),
        pv({ programRef: B.prog }),
        pv({ debitAccountRef: B.ced }),
        pv({ documentId: DOC_PAID }),
        pv({ dueDate: DUE_BEFORE }),
        pv({ dueDate: DUE_AFTER }),
      ]);

      const readerR = await openGeneralReportReader({ connectionString });
      if (!readerR.ok) return assert.fail(JSON.stringify(readerR));
      const reader = readerR.value;

      const totalFor = async (filter: Parameters<typeof reader.list>[0]) => {
        const r = await reader.list(filter, { page: 1, limit: 100 });
        assert.equal(r.ok, true, JSON.stringify(r));
        if (!r.ok) return -1;
        return r.value.total;
      };

      assert.equal(await totalFor({}), 11, 'sem filtro: 11 payables (Cancelled não há)');
      assert.equal(await totalFor({ supplierRef: A.sup }), 10, 'supplierRef restringe');
      assert.equal(await totalFor({ costCenterRef: A.cc }), 10, 'costCenterRef restringe');
      assert.equal(await totalFor({ categoryRef: A.cat }), 10, 'categoryRef restringe');
      assert.equal(await totalFor({ subcategoryRef: A.sub }), 10, 'subcategoryRef restringe');
      assert.equal(await totalFor({ budgetPlanRef: A.plan }), 10, 'budgetPlanRef restringe');
      assert.equal(await totalFor({ programRef: A.prog }), 10, 'programRef restringe');
      assert.equal(await totalFor({ debitAccountRef: A.ced }), 10, 'debitAccountRef restringe');
      assert.equal(
        await totalFor({ status: 'Reconciled' }),
        10,
        'status=Reconciled exclui o doc Paid',
      );
      assert.equal(
        await totalFor({ status: 'Paid' }),
        1,
        'status=Paid isola o payable do doc Paid',
      );
      assert.equal(await totalFor({ status: 'Transmitted' }), 0, 'nenhum doc Transmitted');
      assert.equal(
        await totalFor({ dueFrom: '2026-01-01', dueTo: '2026-07-01' }),
        9,
        'janela half-open exclui antes e depois',
      );

      // AND de todos → só P_MATCH.
      assert.equal(
        await totalFor({
          supplierRef: A.sup,
          costCenterRef: A.cc,
          categoryRef: A.cat,
          subcategoryRef: A.sub,
          budgetPlanRef: A.plan,
          programRef: A.prog,
          debitAccountRef: A.ced,
          status: 'Reconciled',
          dueFrom: '2026-01-01',
          dueTo: '2026-07-01',
        }),
        1,
        'AND de todos os filtros → interseção = 1',
      );

      await reader.close();
    });

    it('CA4: paginação (LIMIT/OFFSET) + total + ORDER BY due_date', async () => {
      await handle.db.insert(handle.schema.finDocuments).values({
        id: DOC1,
        documentNumber: 'DOC-PAGE',
        status: 'Open',
        createdAt: NOW,
      });
      // 5 payables com vencimentos distintos e crescentes.
      const dues = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01'];
      await handle.db.insert(handle.schema.finPayableView).values(
        dues.map((due, i) =>
          payable({
            payableId: `f0000000-0000-4000-8000-0000000000${(i + 1).toString().padStart(2, '0')}`,
            valueCents: 1000 * (i + 1),
            status: 'Open',
            dueDate: due,
          }),
        ),
      );

      const readerR = await openGeneralReportReader({ connectionString });
      if (!readerR.ok) return assert.fail(JSON.stringify(readerR));
      const reader = readerR.value;

      // Página 1 de 2 (limit 2), default ORDER dueDate DESC.
      const p1 = await reader.list({}, { page: 1, limit: 2 });
      assert.equal(p1.ok, true, JSON.stringify(p1));
      if (!p1.ok) return;
      assert.equal(p1.value.total, 5);
      assert.equal(p1.value.page, 1);
      assert.equal(p1.value.pageSize, 2);
      assert.equal(p1.value.items.length, 2);
      assert.equal(p1.value.items[0]!.dueDate, '2026-05-01', 'DESC: vencimento mais recente 1º');
      assert.equal(p1.value.items[1]!.dueDate, '2026-04-01');

      // Página 3 (limit 2) → 1 item restante.
      const p3 = await reader.list({}, { page: 3, limit: 2 });
      assert.equal(p3.ok, true, JSON.stringify(p3));
      if (!p3.ok) return;
      assert.equal(p3.value.items.length, 1);
      assert.equal(p3.value.items[0]!.dueDate, '2026-01-01');

      // ORDER ASC inverte o topo.
      const asc = await reader.list({ order: 'dueDate:asc' }, { page: 1, limit: 1 });
      assert.equal(asc.ok, true, JSON.stringify(asc));
      if (!asc.ok) return;
      assert.equal(asc.value.items[0]!.dueDate, '2026-01-01', 'ASC: vencimento mais antigo 1º');

      await reader.close();
    });

    it('CA5: search (LIKE contains) casa document_number OU nome do fornecedor', async () => {
      const DOC_A = 'd0000000-0000-4000-8000-00000000dca1';
      const DOC_B = 'd0000000-0000-4000-8000-00000000dcb1';
      await handle.db.insert(handle.schema.finDocuments).values([
        { id: DOC_A, documentNumber: 'NFS 9001', status: 'Open', createdAt: NOW },
        { id: DOC_B, documentNumber: 'BOLETO 42', status: 'Open', createdAt: NOW },
      ]);
      await handle.db.insert(handle.schema.finSupplierView).values({
        supplierRef: S1,
        name: 'Padaria Central',
        document: '11222333000181',
        occurredAt: NOW,
        updatedAt: NOW,
      });
      await handle.db.insert(handle.schema.finPayableView).values([
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          documentId: DOC_A,
          supplierRef: S1,
          valueCents: 100,
          status: 'Open',
          dueDate: '2026-07-01',
        }),
        payable({
          payableId: '22000000-0000-4000-8000-000000000022',
          documentId: DOC_B,
          supplierRef: null,
          valueCents: 200,
          status: 'Open',
          dueDate: '2026-07-02',
        }),
      ]);

      const readerR = await openGeneralReportReader({ connectionString });
      if (!readerR.ok) return assert.fail(JSON.stringify(readerR));
      const reader = readerR.value;

      const byCode = await reader.list({ search: 'NFS 90' }, { page: 1, limit: 50 });
      assert.equal(byCode.ok, true, JSON.stringify(byCode));
      if (byCode.ok) assert.equal(byCode.value.total, 1, 'casa document_number');

      const bySupplier = await reader.list({ search: 'Padaria' }, { page: 1, limit: 50 });
      assert.equal(bySupplier.ok, true, JSON.stringify(bySupplier));
      if (bySupplier.ok) assert.equal(bySupplier.value.total, 1, 'casa nome do fornecedor');

      const none = await reader.list({ search: 'inexistente' }, { page: 1, limit: 50 });
      assert.equal(none.ok, true, JSON.stringify(none));
      if (none.ok) assert.equal(none.value.total, 0);

      await reader.close();
    });

    it('CA6 (Slice B · #442): payee_kind projetado por COALESCE; supplierRef = ref do favorecido', async () => {
      const DOC_FIN = 'd0000000-0000-4000-8000-00000000df01'; // payee_kind = 'financier'
      const DOC_COL = 'd0000000-0000-4000-8000-00000000dc01'; // payee_kind = 'collaborator'
      const DOC_LEG = 'd0000000-0000-4000-8000-00000000de01'; // payee_kind NULL → 'supplier'
      const FIN_REF = 'e1000000-0000-4000-8000-0000000000e1';
      const COL_REF = 'e2000000-0000-4000-8000-0000000000e2';
      const SUP_REF = 'e3000000-0000-4000-8000-0000000000e3';

      await handle.db.insert(handle.schema.finDocuments).values([
        { id: DOC_FIN, payeeKind: 'financier', status: 'Open', createdAt: NOW },
        { id: DOC_COL, payeeKind: 'collaborator', status: 'Open', createdAt: NOW },
        // payee_kind NULL (pré-#90) → lido como 'supplier' pelo COALESCE.
        { id: DOC_LEG, payeeKind: null, status: 'Open', createdAt: NOW },
      ]);

      await handle.db.insert(handle.schema.finPayableView).values([
        payable({
          payableId: 'f0000000-0000-4000-8000-0000000000f1',
          documentId: DOC_FIN,
          supplierRef: FIN_REF,
          valueCents: 100,
          status: 'Open',
          dueDate: '2026-07-01',
        }),
        payable({
          payableId: 'f0000000-0000-4000-8000-0000000000f2',
          documentId: DOC_COL,
          supplierRef: COL_REF,
          valueCents: 200,
          status: 'Open',
          dueDate: '2026-07-02',
        }),
        payable({
          payableId: 'f0000000-0000-4000-8000-0000000000f3',
          documentId: DOC_LEG,
          supplierRef: SUP_REF,
          valueCents: 300,
          status: 'Open',
          dueDate: '2026-07-03',
        }),
      ]);

      const readerR = await openGeneralReportReader({ connectionString });
      if (!readerR.ok) return assert.fail(JSON.stringify(readerR));
      const reader = readerR.value;
      const r = await reader.list({ order: 'dueDate:asc' }, { page: 1, limit: 50 });
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      const byRef = new Map(r.value.items.map((line) => [line.supplierRef, line]));

      const fin = byRef.get(FIN_REF)!;
      assert.equal(fin.payeeKind, 'financier', 'payee_kind financier projetado');
      assert.equal(fin.supplierRef, FIN_REF, 'supplierRef = ref do favorecido (financier)');

      const col = byRef.get(COL_REF)!;
      assert.equal(col.payeeKind, 'collaborator', 'payee_kind collaborator projetado');
      assert.equal(col.supplierRef, COL_REF, 'supplierRef = ref do favorecido (collaborator)');

      const leg = byRef.get(SUP_REF)!;
      assert.equal(leg.payeeKind, 'supplier', 'payee_kind NULL → supplier (COALESCE)');
      assert.equal(leg.supplierRef, SUP_REF);
    });
  });
}
