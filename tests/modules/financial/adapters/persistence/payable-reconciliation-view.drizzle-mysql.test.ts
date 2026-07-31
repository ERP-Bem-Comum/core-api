// Integração (#323) — PayableReconciliationView.searchPaid (SELECT fin_payables ⟕ fin_documents)
// contra MySQL real. REGRESSÃO: "TODO título pago aparece na conciliação". Antes do fix, o WHERE
// filtrava o PAYABLE individual (`status='Paid'`) e as retenções (IRRF/CSRF ainda Open/Approved de
// um documento pago) ficavam órfãs — embora o grid Contas a Pagar as mostre PAGO (deriva do DOCUMENTO).
//
// O fix reflete o status do DOCUMENTO: WHERE (fin_documents.status='Paid' OR fin_payables.status='Paid')
// AND fin_payables.status<>'Reconciled'. Este teste prova os 3-de-3 do doc pago, exclui o Reconciled
// (salvaguarda), exclui o doc Open e inclui a borda (título Paid com doc não-Pago).
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver scripts/ci/test-integration.ts §financial).
// Isolamento: assertion por MEMBERSHIP dos ids semeados (searchPaid é global, sem filtro de id) →
// order-independent sem depender de wipe de tabelas FK-referenciadas por arquivos irmãos.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzlePayableReconciliationView } from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.drizzle.ts';
import {
  finDocuments,
  finPayables,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:payable-reconciliation-view] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  const D = new Date('2026-08-01T00:00:00.000Z');
  const NOW = new Date('2026-07-01T00:00:00.000Z');

  describe('PayableReconciliationView.searchPaid — Drizzle + MySQL (integração) (#323)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:payable-reconciliation-view] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    // Semeia um documento com o status dado. Só as colunas NOT NULL sem default (id, status, createdAt).
    const seedDocument = async (status: DocumentStatus): Promise<string> => {
      const id = newUuid();
      await handle.db.insert(finDocuments).values({
        id,
        type: 'NFS-e',
        status,
        paymentMethod: 'PIX',
        grossValue: 5000,
        netValue: 5000,
        dueDate: D,
        createdAt: NOW,
      });
      return id;
    };

    // Semeia um título do documento. `paidAt` obrigatório quando status='Paid' (CHECK fin_payables_paid_at_chk).
    const seedPayable = async (
      documentId: string,
      opts: Readonly<{
        status: DocumentStatus;
        kind: 'Parent' | 'Child';
        retentionType?: 'IRRF' | 'CSRF';
      }>,
    ): Promise<string> => {
      const id = newUuid();
      await handle.db.insert(finPayables).values({
        id,
        documentId,
        kind: opts.kind,
        retentionType: opts.retentionType ?? null,
        status: opts.status,
        value: 1000,
        dueDate: D,
        paymentMethod: 'PIX',
        paidAt: opts.status === 'Paid' ? D : null,
        createdAt: NOW,
      });
      return id;
    };

    it('CI1: documento Pago → líquido Paid + 2 retenções Open/Approved (os 3) são candidatos; Reconciled/doc-Open excluídos; borda incluída', async () => {
      // Documento PAGO com 3 títulos: líquido Paid + retenções IRRF (Open) e CSRF (Approved).
      const paidDoc = await seedDocument('Paid');
      const netPaid = await seedPayable(paidDoc, { status: 'Paid', kind: 'Parent' });
      const irrfOpen = await seedPayable(paidDoc, {
        status: 'Open',
        kind: 'Child',
        retentionType: 'IRRF',
      });
      const csrfApproved = await seedPayable(paidDoc, {
        status: 'Approved',
        kind: 'Child',
        retentionType: 'CSRF',
      });

      // Documento PAGO com título já CONCILIADO → salvaguarda (não reofertar).
      const reconciledDoc = await seedDocument('Paid');
      const alreadyReconciled = await seedPayable(reconciledDoc, {
        status: 'Reconciled',
        kind: 'Parent',
      });

      // Documento NÃO-PAGO (Open) → nenhum candidato.
      const openDoc = await seedDocument('Open');
      const openNet = await seedPayable(openDoc, { status: 'Open', kind: 'Parent' });

      // Borda (P.O.): título Paid cujo DOCUMENTO não está Pago → deve aparecer via OR.
      const edgeDoc = await seedDocument('Open');
      const edgePaid = await seedPayable(edgeDoc, { status: 'Paid', kind: 'Parent' });

      const view = createDrizzlePayableReconciliationView(handle);
      const r = await view.searchPaid();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      const ids = new Set(r.value.map((v) => v.id));

      // Os 3-de-3 do documento pago (hoje, sem o fix, só o líquido volta → RED).
      assert.equal(ids.has(netPaid), true, 'líquido Paid do doc pago');
      assert.equal(ids.has(irrfOpen), true, 'retenção IRRF (Open) do doc pago');
      assert.equal(ids.has(csrfApproved), true, 'retenção CSRF (Approved) do doc pago');

      // Salvaguarda + exclusões.
      assert.equal(ids.has(alreadyReconciled), false, 'título Reconciled NÃO é reofertado');
      assert.equal(ids.has(openNet), false, 'título de documento Open não aparece');

      // Borda: título Paid com doc não-Pago aparece (defesa em profundidade do OR).
      assert.equal(ids.has(edgePaid), true, 'título Paid com doc não-Pago aparece via OR');
    });
  });
}
