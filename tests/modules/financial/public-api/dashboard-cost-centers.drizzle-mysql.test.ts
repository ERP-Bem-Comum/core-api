/**
 * Integração (DASH-F1 · #241) — `openDashboardCostCentersReader().list(windows)` no MySQL real.
 *
 * Prova os DOIS CASE-SUM por Centro de Custo sobre `fin_payable_view` (WHERE status='Paid'):
 *  - m1Cents = Σ value_cents WHERE paid_at ∈ [m1Start, m1End);
 *  - m2Cents = Σ value_cents WHERE paid_at ∈ [m2Start, m2End).
 * GROUP BY cost_center_ref (+ nome via LEFT JOIN fin_cost_centers). Semeia Paid em M-1 e M-2 com CCs
 * distintos + um Cancelled (fora do WHERE) + um Paid fora das janelas (conta 0) — provando que só Paid
 * nas janelas soma. As janelas são INPUT do método (referência fixa), nunca boot-time.
 * #233 (fidelidade): CCs reais e distintos — a agregação é por Centro de Custo, não por categoria.
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * Contrato de isolamento: limpa as duas tabelas na ENTRADA (beforeEach), por tabela.
 * Molde: `suppliers-without-contract-top.drizzle-mysql.test.ts`.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openDashboardCostCentersReader } from '#src/modules/financial/public-api/dashboard-cost-centers-projection.ts';
import type { DashboardCostCentersWindows } from '#src/modules/financial/public-api/dashboard-cost-centers-projection.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  mysqlTestConnectionString();

const NOW = new Date('2026-07-15T12:00:00.000Z');
// Referência = 2026-07-15 → M-1 = junho [2026-06-01, 2026-07-01); M-2 = maio [2026-05-01, 2026-06-01).
const WINDOWS: DashboardCostCentersWindows = {
  m1Start: new Date(Date.UTC(2026, 5, 1)),
  m1End: new Date(Date.UTC(2026, 6, 1)),
  m2Start: new Date(Date.UTC(2026, 4, 1)),
  m2End: new Date(Date.UTC(2026, 5, 1)),
};

const cc = (n: number): string => `cc000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:dashboard-cost-centers] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openDashboardCostCentersReader.list — Drizzle + MySQL (DASH-F1 · #241)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:dashboard-cost-centers] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // `fin_payable_view` é read-model puro, sem seed: apagar a tabela inteira é o certo aqui.
      await handle.db.delete(handle.schema.finPayableView);
      // ⚠️ `fin_cost_centers` NÃO, e a assimetria é a regra, não uma exceção deste arquivo: a
      // tabela carrega o SEED das migrations 0013/0043. Um `delete` sem `WHERE` apagava o seed
      // junto, e ele não volta — a migration já está aplicada. O efeito aparecia longe da causa,
      // em `cost-center-read.drizzle-mysql.test.ts` ("list() lê o seed da migration 0013"), que
      // passava sozinho e falhava depois deste arquivo.
      //
      // Apaga-se o que ESTE arquivo insere, como os três irmãos que também escrevem aqui
      // (`general-report`, `payables-analysis`, `payment-position`) já faziam.
      await handle.db
        .delete(handle.schema.finCostCenters)
        .where(inArray(handle.schema.finCostCenters.id, [cc(1), cc(2)]));
    });

    let pk = 0;
    const payable = (over: {
      costCenterRef: string | null;
      valueCents: number;
      status: string;
      paidAt: string | null;
    }) => ({
      payableId: `11000000-0000-4000-8000-${String(++pk).padStart(12, '0')}`,
      documentId: `dc000000-0000-4000-8000-${String(pk).padStart(12, '0')}`,
      kind: 'Parent',
      retentionType: null,
      supplierRef: null,
      contractRef: null,
      costCenterRef: over.costCenterRef,
      valueCents: over.valueCents,
      dueDate: '2026-08-01',
      status: over.status,
      paidAt: over.paidAt,
      updatedAt: NOW,
    });

    const list = async (windows: DashboardCostCentersWindows) => {
      const readerR = await openDashboardCostCentersReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) throw new Error('reader não abriu');
      const reader = readerR.value;
      const r = await reader.list(windows);
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) throw new Error('list falhou');
      return r.value;
    };

    it('dois CASE-SUM por CC; só Paid nas janelas conta; Cancelled e Paid fora ficam de fora', async () => {
      await handle.db.insert(handle.schema.finCostCenters).values([
        { id: cc(1), code: 'CC1', name: 'Alpha', active: true },
        { id: cc(2), code: 'CC2', name: 'Beta', active: true },
      ]);
      await handle.db.insert(handle.schema.finPayableView).values([
        // cc1: pago em M-1 (60000) e em M-2 (40000).
        payable({ costCenterRef: cc(1), valueCents: 60000, status: 'Paid', paidAt: '2026-06-10' }),
        payable({ costCenterRef: cc(1), valueCents: 40000, status: 'Paid', paidAt: '2026-05-05' }),
        // cc2: pago em M-1 (30000).
        payable({ costCenterRef: cc(2), valueCents: 30000, status: 'Paid', paidAt: '2026-06-20' }),
        // CC nulo (título sem centro de custo): pago em M-1 (10000).
        payable({ costCenterRef: null, valueCents: 10000, status: 'Paid', paidAt: '2026-06-25' }),
        // Cancelled em M-1 (fora do WHERE status='Paid').
        payable({
          costCenterRef: cc(1),
          valueCents: 99999,
          status: 'Cancelled',
          paidAt: '2026-06-11',
        }),
        // Paid ANTES de M-2 (fora das janelas → CASE 0 nos dois baldes).
        payable({ costCenterRef: cc(2), valueCents: 88888, status: 'Paid', paidAt: '2026-04-01' }),
        // Paid DEPOIS de M-1 (fora das janelas → CASE 0 nos dois baldes).
        payable({ costCenterRef: cc(1), valueCents: 77777, status: 'Paid', paidAt: '2026-07-05' }),
      ]);

      const rows = await list(WINDOWS);
      const byRef = new Map(rows.map((r) => [r.ref, r]));

      assert.deepEqual(byRef.get(cc(1)), {
        ref: cc(1),
        name: 'Alpha',
        m1Cents: 60000,
        m2Cents: 40000,
      });
      // cc2: m1=30000; o Paid fora das janelas (88888) soma 0 nos dois baldes.
      assert.deepEqual(byRef.get(cc(2)), { ref: cc(2), name: 'Beta', m1Cents: 30000, m2Cents: 0 });
      // CC nulo: grupo válido, nome null (sem match no LEFT JOIN).
      assert.deepEqual(byRef.get(null), { ref: null, name: null, m1Cents: 10000, m2Cents: 0 });

      // Nenhum grupo extra além dos 3 (Cancelled não vira linha; os Paid fora entram nos grupos existentes).
      assert.equal(rows.length, 3, JSON.stringify(rows));
    });

    it('sem despesas pagas nas janelas → nenhuma linha somando (ou baldes zerados)', async () => {
      await handle.db
        .insert(handle.schema.finPayableView)
        .values([
          payable({ costCenterRef: cc(1), valueCents: 5000, status: 'Open', paidAt: null }),
        ]);
      const rows = await list(WINDOWS);
      // Open não passa no WHERE status='Paid' → sem grupo.
      assert.equal(rows.length, 0, JSON.stringify(rows));
    });
  });
}
