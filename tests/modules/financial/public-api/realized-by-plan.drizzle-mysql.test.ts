/**
 * Integração (BGP-INSIGHTS-REALIZED · #416) — openRealizedByPlanReader (financial public-api).
 *
 * O "Realizado" de um Plano Orçamentário = Σ dos `reconciled_value_cents` das reconciliações
 * **Active** dos títulos cujo documento tem `budget_plan_ref = id do plano`. JOIN 3-hop
 * intra-financial: fin_reconciliation_items → fin_reconciliations (status='Active') →
 * fin_payables (para o document_id) → fin_documents (budget_plan_ref). Valida contra MySQL real.
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * W0 RED: `openRealizedByPlanReader` ainda não existe — import dinâmico dentro do gate (precedente
 * #437) para NÃO quebrar o link ESM do `pnpm test` puro (sem o env, o describe inteiro é pulado).
 *
 * CA1 — soma por plano; CA2 — inclui parciais (R$60 de R$100 → 60) e exclui `Undone`;
 * CA5 — batch de vários refs (anti-N+1); ref sem conciliação → 0/ausente do map.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  finDocuments,
  finPayables,
  finReconciliations,
  finReconciliationItems,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { newUuid } from '#src/shared/utils/id.ts';

// Assinatura pinada pelo W0 (o W1 implementa exatamente isto):
//   openRealizedByPlanReader({ connectionString }): Promise<Result<RealizedByPlanReader, string>>
//   RealizedByPlanReader = { getByPlans(refs: readonly string[]): Promise<Result<ReadonlyMap<string, number>, string>>; close(): Promise<void> }
type OpenRealizedByPlanReader = (opts: Readonly<{ connectionString: string }>) => Promise<
  | Readonly<{
      ok: true;
      value: Readonly<{
        getByPlans: (
          refs: readonly string[],
        ) => Promise<
          | Readonly<{ ok: true; value: ReadonlyMap<string, number> }>
          | Readonly<{ ok: false; error: string }>
        >;
        close: () => Promise<void>;
      }>;
    }>
  | Readonly<{ ok: false; error: string }>
>;

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const P1 = '10000000-0000-4000-8000-000000000001';
const P2 = '20000000-0000-4000-8000-000000000002';
const P3 = '30000000-0000-4000-8000-000000000003';
const NOW = new Date('2026-07-14T12:00:00.000Z');
const RECONCILED_BY = '99999999-9999-4999-8999-999999999999';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:realized-by-plan] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openRealizedByPlanReader — Drizzle + MySQL (BGP-INSIGHTS-REALIZED · #416)', () => {
    let handle: FinancialMysqlHandle;
    let openRealizedByPlanReader: OpenRealizedByPlanReader;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:realized-by-plan] conexão: ${r.error}`);
      handle = r.value;
      // Import dinâmico: no W0 o módulo ainda não existe → falha aqui SÓ sob o gate (RED do W3).
      const mod = await import('#src/modules/financial/public-api/realized-by-plan-projection.ts');
      openRealizedByPlanReader = mod.openRealizedByPlanReader as OpenRealizedByPlanReader;
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

    // Semeia: 1 documento (com budget_plan_ref) + 1 título Paid + 1 reconciliação (status) com
    // `reconciled_value_cents`. Devolve o payableId (irrelevante para as asserções, útil p/ debug).
    const seedReconciled = async (over: {
      planRef: string;
      payableValueCents: number;
      reconciledValueCents: number;
      reconStatus: 'Active' | 'Undone';
    }): Promise<string> => {
      const documentId = newUuid();
      const payableId = newUuid();
      const reconciliationId = newUuid();

      await handle.db.insert(finDocuments).values({
        id: documentId,
        status: 'Open',
        budgetPlanRef: over.planRef,
        createdAt: NOW,
      });
      await handle.db.insert(finPayables).values({
        id: payableId,
        documentId,
        kind: 'Parent',
        status: 'Paid',
        value: over.payableValueCents,
        dueDate: NOW,
        paymentMethod: 'PIX',
        paidAt: NOW,
        createdAt: NOW,
      });
      await handle.db.insert(finReconciliations).values({
        id: reconciliationId,
        transactionId: newUuid(),
        type: 'Individual',
        status: over.reconStatus,
        reconciledAt: NOW,
        reconciledBy: RECONCILED_BY,
      });
      await handle.db.insert(finReconciliationItems).values({
        reconciliationId,
        payableId,
        reconciledValueCents: over.reconciledValueCents,
      });
      return payableId;
    };

    it('CA1/CA2: soma por plano inclui parciais e exclui reconciliações Undone', async () => {
      // Plano P1: título cheio (100→100 Active) + parcial (100→60 Active) + um Undone (100→100).
      await seedReconciled({
        planRef: P1,
        payableValueCents: 10000,
        reconciledValueCents: 10000,
        reconStatus: 'Active',
      });
      await seedReconciled({
        planRef: P1,
        payableValueCents: 10000,
        reconciledValueCents: 6000, // parcial: R$60 de R$100 → entra com 60
        reconStatus: 'Active',
      });
      await seedReconciled({
        planRef: P1,
        payableValueCents: 10000,
        reconciledValueCents: 10000,
        reconStatus: 'Undone', // NÃO conta
      });

      const readerR = await openRealizedByPlanReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.getByPlans([P1]);
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.value.get(P1), 16000, 'cheio 10000 + parcial 6000; Undone excluído');
    });

    it('CA5: batch de vários refs; ref sem conciliação → 0/ausente do map', async () => {
      await seedReconciled({
        planRef: P1,
        payableValueCents: 10000,
        reconciledValueCents: 10000,
        reconStatus: 'Active',
      });
      await seedReconciled({
        planRef: P2,
        payableValueCents: 5000,
        reconciledValueCents: 5000,
        reconStatus: 'Active',
      });
      // P3: nenhum título/conciliação.

      const readerR = await openRealizedByPlanReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.getByPlans([P1, P2, P3]);
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.value.get(P1), 10000);
      assert.equal(r.value.get(P2), 5000);
      assert.equal(r.value.get(P3) ?? 0, 0, 'ref sem conciliação = 0/ausente');
    });
  });
}
