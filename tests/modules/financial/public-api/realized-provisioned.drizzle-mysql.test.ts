/**
 * FIN-REALIZED-PROVISIONED-READ (fatia 2/3 de REPORTS-REALIZED-VS-PLANNED) — W0 RED.
 *
 * Novo reader boot-scoped na public-api do financial: `openRealizedProvisionedReader`. Agrega DUAS
 * medidas por `(budgetPlanRef, categoryRef, mês)`:
 *   - Realizado    = Σ `fin_reconciliation_items.reconciled_value_cents` de reconciliações
 *                    `status='Active'` (inclui parciais — soma o valor CONCILIADO; exclui `Undone`).
 *                    Mês vem de `fin_reconciliations.reconciled_at`.
 *   - Provisionado = títulos `fin_payables.status='Approved'` SEM item de conciliação `Active`.
 *                    Mês vem de `fin_payables.due_date`.
 * JOIN até plano/categoria (o mesmo do #416): fin_reconciliation_items → fin_reconciliations →
 * fin_payables → fin_documents (budget_plan_ref, category_ref).
 *
 * DEVE FALHAR em W0: `#src/modules/financial/public-api/realized-provisioned-projection.ts` ainda
 * NÃO existe — o import de topo quebra (ERR_MODULE_NOT_FOUND) e TODO este arquivo fica vermelho.
 * Esse É o RED pelo motivo certo (inexistência do módulo), não asserção frouxa.
 *
 * Estrutura (molde realized-by-plan.drizzle-mysql.test.ts + budget-plans-etl-port):
 *   1. ESTRUTURAL — superfície do reader + conn malformada → Result err kebab (roda no pnpm test puro).
 *   2. INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — CA2/CA3/CA4/CA5/CA6 contra MySQL real.
 *
 * ASCII puro. Código EN, comentários PT-BR.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import {
  openRealizedProvisionedReader,
  type RealizedProvisionedReader,
  type RealizedProvisionedRow,
} from '#src/modules/financial/public-api/realized-provisioned-projection.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  finDocuments,
  finPayables,
  finReconciliations,
  finReconciliationItems,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { newUuid } from '#src/shared/utils/id.ts';

// ── Assinatura pinada pelo W0 (o W1 implementa EXATAMENTE isto) ──────────────────────────────────
//   openRealizedProvisionedReader({ connectionString }): Promise<Result<RealizedProvisionedReader, string>>
//   RealizedProvisionedReader = {
//     list(filter: { budgetPlanRef?: string; year?: number }):
//       Promise<Result<readonly RealizedProvisionedRow[], string>>;
//     close(): Promise<void>;
//   }
//   RealizedProvisionedRow = Readonly<{
//     budgetPlanRef: string; categoryRef: string | null; month: string; // 'YYYY-MM'
//     realizedCents: number; provisionedCents: number;
//   }>

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const MALFORMED_CONN = 'not-a-mysql-url';

const P1 = '10000000-0000-4000-8000-000000000001';
const P2 = '20000000-0000-4000-8000-000000000002';
const CAT_A = 'aaaa0000-0000-4000-8000-00000000000a';
const CAT_B = 'bbbb0000-0000-4000-8000-00000000000b';
const RECONCILED_BY = '99999999-9999-4999-8999-999999999999';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ESTRUTURAL — roda SEMPRE no `pnpm test` puro (superfície + conn malformada).
//    Em W0 o import de topo já quebrou o arquivo inteiro → RED por inexistência.
// ─────────────────────────────────────────────────────────────────────────────
describe('FIN-REALIZED-PROVISIONED-READ — superfície do reader (estrutural)', () => {
  it('exporta openRealizedProvisionedReader como função', () => {
    assert.equal(typeof openRealizedProvisionedReader, 'function');
  });

  it('CA8 (sem DB): connection-string malformada → Result err com slug kebab EN, nunca throw', async () => {
    const r = await openRealizedProvisionedReader({ connectionString: MALFORMED_CONN });
    assert.equal(r.ok, false, 'string malformada deve reprovar');
    if (r.ok) return;
    assert.match(
      r.error,
      /^[a-z][a-z0-9-]*$/,
      'erro deve ser slug kebab EN (sem espaço, sem caps)',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — as duas medidas contra MySQL real.
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:realized-provisioned] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openRealizedProvisionedReader — Drizzle + MySQL (FIN-REALIZED-PROVISIONED-READ)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:realized-provisioned] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // Agregação de estado absoluto → dona das próprias precondições (ordem FK-safe).
      await handle.db.delete(finReconciliationItems);
      await handle.db.delete(finReconciliations);
      await handle.db.delete(finPayables);
      await handle.db.delete(finDocuments);
    });

    // Semeia um título CONCILIADO (realizado): documento (plano+categoria) + payable +
    // reconciliação (status/reconciled_at) + item (reconciled_value_cents). `dueDate` do título
    // é irrelevante para o realizado (mês vem de reconciled_at) mas é NOT NULL no schema.
    const seedReconciled = async (over: {
      planRef: string;
      categoryRef: string | null;
      payableValueCents: number;
      reconciledValueCents: number;
      reconStatus: 'Active' | 'Undone';
      reconciledAt: Date;
      dueDate: Date;
      payableStatus: 'Paid' | 'PartiallyReconciled' | 'Reconciled';
    }): Promise<void> => {
      const documentId = newUuid();
      const payableId = newUuid();
      const reconciliationId = newUuid();

      await handle.db.insert(finDocuments).values({
        id: documentId,
        status: 'Open',
        budgetPlanRef: over.planRef,
        categoryRef: over.categoryRef,
        createdAt: over.reconciledAt,
      });
      await handle.db.insert(finPayables).values({
        id: payableId,
        documentId,
        kind: 'Parent',
        status: over.payableStatus,
        value: over.payableValueCents,
        dueDate: over.dueDate,
        paymentMethod: 'PIX',
        paidAt: over.dueDate,
        createdAt: over.reconciledAt,
      });
      await handle.db.insert(finReconciliations).values({
        id: reconciliationId,
        transactionId: newUuid(),
        type: 'Individual',
        status: over.reconStatus,
        reconciledAt: over.reconciledAt,
        reconciledBy: RECONCILED_BY,
      });
      await handle.db.insert(finReconciliationItems).values({
        reconciliationId,
        payableId,
        reconciledValueCents: over.reconciledValueCents,
      });
    };

    // Semeia um título PROVISIONADO: documento (plano+categoria) + payable Approved, SEM
    // conciliação. Mês vem de `due_date`. `paidAt` null (Approved não é Paid).
    const seedApproved = async (over: {
      planRef: string;
      categoryRef: string | null;
      valueCents: number;
      dueDate: Date;
    }): Promise<void> => {
      const documentId = newUuid();
      const payableId = newUuid();

      await handle.db.insert(finDocuments).values({
        id: documentId,
        status: 'Open',
        budgetPlanRef: over.planRef,
        categoryRef: over.categoryRef,
        createdAt: over.dueDate,
      });
      await handle.db.insert(finPayables).values({
        id: payableId,
        documentId,
        kind: 'Parent',
        status: 'Approved',
        value: over.valueCents,
        dueDate: over.dueDate,
        paymentMethod: 'PIX',
        paidAt: null,
        createdAt: over.dueDate,
      });
    };

    const listAll = async (
      filter: Readonly<{ budgetPlanRef?: string; year?: number }>,
    ): Promise<readonly RealizedProvisionedRow[]> => {
      const readerR = await openRealizedProvisionedReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) throw new Error('reader não abriu');
      const reader: RealizedProvisionedReader = readerR.value;
      const r = await reader.list(filter);
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) throw new Error('list falhou');
      return r.value;
    };

    const find = (
      rows: readonly RealizedProvisionedRow[],
      plan: string,
      cat: string | null,
      month: string,
    ): RealizedProvisionedRow | undefined =>
      rows.find(
        (row) => row.budgetPlanRef === plan && row.categoryRef === cat && row.month === month,
      );

    it('CA2: realizado por (plano, categoria, mês=reconciled_at); parcial soma o valor CONCILIADO; Undone excluído', async () => {
      // P1/CAT_A, conciliados em 2026-03: cheio (100→100) + parcial (100→60) + um Undone (100→100).
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        payableValueCents: 10000,
        reconciledValueCents: 10000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-03-10T12:00:00.000Z'),
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        payableValueCents: 10000,
        reconciledValueCents: 6000, // parcial: R$60 de R$100 → entra com 60
        reconStatus: 'Active',
        reconciledAt: new Date('2026-03-20T12:00:00.000Z'),
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        payableStatus: 'PartiallyReconciled',
      });
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        payableValueCents: 10000,
        reconciledValueCents: 10000,
        reconStatus: 'Undone', // NÃO conta (CA5)
        reconciledAt: new Date('2026-03-25T12:00:00.000Z'),
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        payableStatus: 'Paid',
      });

      const rows = await listAll({});
      const row = find(rows, P1, CAT_A, '2026-03');
      assert.ok(row, 'esperava row (P1, CAT_A, 2026-03)');
      assert.equal(row.realizedCents, 16000, 'cheio 10000 + parcial 6000; Undone excluído');
      assert.equal(row.provisionedCents, 0, 'nada provisionado neste bucket');
    });

    it('CA3: provisionado por (plano, categoria, mês=due_date) = títulos Approved sem conciliação', async () => {
      // P1/CAT_A: dois títulos Approved vencendo em 2026-05 (150 + 250).
      await seedApproved({
        planRef: P1,
        categoryRef: CAT_A,
        valueCents: 15000,
        dueDate: new Date('2026-05-10T00:00:00.000Z'),
      });
      await seedApproved({
        planRef: P1,
        categoryRef: CAT_A,
        valueCents: 25000,
        dueDate: new Date('2026-05-20T00:00:00.000Z'),
      });

      const rows = await listAll({});
      const row = find(rows, P1, CAT_A, '2026-05');
      assert.ok(row, 'esperava row (P1, CAT_A, 2026-05)');
      assert.equal(row.provisionedCents, 40000, '15000 + 25000 Approved');
      assert.equal(row.realizedCents, 0, 'nada realizado neste bucket');
    });

    it('CA4 (⊻): um título parcialmente conciliado entra no realizado e NUNCA no provisionado', async () => {
      // Título 100→60 Active (status PartiallyReconciled). O resto (40) NÃO vira provisionado:
      // provisionado exige status='Approved' e o título já não é Approved (ver REPORT.md → P.O.).
      await seedReconciled({
        planRef: P2,
        categoryRef: CAT_B,
        payableValueCents: 10000,
        reconciledValueCents: 6000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-07-05T12:00:00.000Z'),
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        payableStatus: 'PartiallyReconciled',
      });
      // Um título 100% conciliado (não-ambíguo) e um 0% conciliado / Approved (não-ambíguo).
      await seedReconciled({
        planRef: P2,
        categoryRef: CAT_B,
        payableValueCents: 20000,
        reconciledValueCents: 20000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-07-08T12:00:00.000Z'),
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });
      await seedApproved({
        planRef: P2,
        categoryRef: CAT_B,
        valueCents: 30000,
        dueDate: new Date('2026-07-15T00:00:00.000Z'),
      });

      const rows = await listAll({});
      const row = find(rows, P2, CAT_B, '2026-07');
      assert.ok(row, 'esperava row (P2, CAT_B, 2026-07)');
      // Realizado: 6000 (parcial) + 20000 (cheio) = 26000. O 40 do parcial NÃO entra em lugar nenhum.
      assert.equal(row.realizedCents, 26000, 'parcial 6000 + cheio 20000');
      // Provisionado: só o título Approved (30000). O remanescente do parcial NÃO conta (⊻).
      assert.equal(row.provisionedCents, 30000, 'só o Approved; remanescente do parcial excluído');
    });

    it('CA5: título com apenas conciliação Undone não aparece em NENHUMA das duas medidas', async () => {
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        payableValueCents: 10000,
        reconciledValueCents: 10000,
        reconStatus: 'Undone',
        reconciledAt: new Date('2026-09-10T12:00:00.000Z'),
        dueDate: new Date('2026-09-01T00:00:00.000Z'),
        payableStatus: 'Paid', // status pós-undo NÃO é Approved → também fora do provisionado
      });

      const rows = await listAll({});
      const row = find(rows, P1, CAT_A, '2026-09');
      // Ou não há row, ou há mas zerada nos dois lados.
      assert.equal(row?.realizedCents ?? 0, 0, 'Undone não é realizado');
      assert.equal(
        row?.provisionedCents ?? 0,
        0,
        'Paid pós-undo não é Approved → não provisionado',
      );
    });

    it('CA6: os dois eixos de data são independentes — mesma nota vence em março (prov.) e é conciliada em abril (real.)', async () => {
      // Realizado: conciliado em 2026-04.
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        payableValueCents: 5000,
        reconciledValueCents: 5000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-04-10T12:00:00.000Z'),
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });
      // Provisionado: Approved vencendo em 2026-03.
      await seedApproved({
        planRef: P1,
        categoryRef: CAT_A,
        valueCents: 7000,
        dueDate: new Date('2026-03-20T00:00:00.000Z'),
      });

      const rows = await listAll({});
      const mar = find(rows, P1, CAT_A, '2026-03');
      const apr = find(rows, P1, CAT_A, '2026-04');
      assert.ok(mar, 'esperava bucket 2026-03 (provisionado)');
      assert.equal(mar.provisionedCents, 7000, 'Approved due em março');
      assert.equal(mar.realizedCents, 0, 'nada realizado em março');
      assert.ok(apr, 'esperava bucket 2026-04 (realizado)');
      assert.equal(apr.realizedCents, 5000, 'conciliado em abril');
      assert.equal(apr.provisionedCents, 0, 'nada provisionado em abril');
    });

    it('CA6/filtro: year filtra cada medida no seu eixo (realizado por reconciled_at, provisionado por due_date)', async () => {
      // Realizado conciliado em 2026; provisionado vencendo em 2025.
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        payableValueCents: 9000,
        reconciledValueCents: 9000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-02-10T12:00:00.000Z'),
        dueDate: new Date('2025-11-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });
      await seedApproved({
        planRef: P1,
        categoryRef: CAT_A,
        valueCents: 4000,
        dueDate: new Date('2025-12-10T00:00:00.000Z'),
      });

      const rows2026 = await listAll({ year: 2026 });
      assert.equal(
        rows2026.reduce((s, r) => s + r.provisionedCents, 0),
        0,
        'year=2026: provisionado (due 2025) fora',
      );
      assert.equal(
        rows2026.reduce((s, r) => s + r.realizedCents, 0),
        9000,
        'year=2026: realizado (reconciled 2026) dentro',
      );

      const rows2025 = await listAll({ year: 2025 });
      assert.equal(
        rows2025.reduce((s, r) => s + r.realizedCents, 0),
        0,
        'year=2025: realizado (reconciled 2026) fora',
      );
      assert.equal(
        rows2025.reduce((s, r) => s + r.provisionedCents, 0),
        4000,
        'year=2025: provisionado (due 2025) dentro',
      );
    });

    it('filtro budgetPlanRef: isola um plano nas duas medidas', async () => {
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        payableValueCents: 1000,
        reconciledValueCents: 1000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-06-10T12:00:00.000Z'),
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });
      await seedApproved({
        planRef: P2,
        categoryRef: CAT_B,
        valueCents: 2000,
        dueDate: new Date('2026-06-15T00:00:00.000Z'),
      });

      const onlyP1 = await listAll({ budgetPlanRef: P1 });
      assert.ok(
        onlyP1.every((r) => r.budgetPlanRef === P1),
        'só rows de P1',
      );
      assert.equal(
        onlyP1.reduce((s, r) => s + r.realizedCents, 0),
        1000,
      );
      assert.equal(
        onlyP1.reduce((s, r) => s + r.provisionedCents, 0),
        0,
        'provisionado de P2 fora do filtro P1',
      );
    });
  });
}
