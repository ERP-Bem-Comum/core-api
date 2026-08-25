// Integração (#358) — DocumentSummaryByIdsView (SELECT fin_documents ⟕ recon ⟕ fin_supplier_view)
// contra MySQL real. Cobre o que o driver `memory` não cobre (documents-batch.http.test.ts): a
// resolução de fato do LEFT JOIN com `fin_supplier_view` — supplierName/supplierDocument preenchidos
// quando o read-model tem a linha, `null` por degradação graciosa quando não tem.
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).
// Espelha o mecanismo de gate/bootstrap/teardown de
// tests/modules/financial/adapters/persistence/payable-summary-by-ids-view.drizzle-mysql.test.ts (#357).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentSummaryByIdsView } from '#src/modules/financial/adapters/persistence/repos/document-summary-by-ids-view.drizzle.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzleSupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.drizzle.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:document-summary-by-ids-view] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('DocumentSummaryByIdsView — Drizzle + MySQL (integração) (#358)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:document-summary-by-ids-view] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    // Semeia um documento Open (todos os campos obrigatórios presentes) e retorna seu documentId +
    // o supplierRef usado — mesmo caminho canônico de payable-summary-by-ids-view.drizzle-mysql.test.ts.
    const seedDocument = async (opts?: {
      documentNumber?: string;
      supplierRef?: string;
    }): Promise<{ documentId: string; supplierRef: string }> => {
      const documentNumber = opts?.documentNumber ?? `NF-${newUuid().slice(0, 8)}`;
      const supplierRef = opts?.supplierRef ?? newUuid();

      const save = saveDocument({
        repo: createDrizzleDocumentRepository(handle),
        clock: ClockReal(),
        contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
        cedenteAccountStore: createInMemoryCedenteAccountStore(),
      });

      const created = await save({
        documentNumber,
        type: 'NFS-e',
        supplierRef,
        paymentMethod: 'PIX',
        grossValueCents: 5000,
        retentions: [],
        registeredTaxes: [],
        dueDate: new Date('2026-08-01T00:00:00.000Z'),
        description: null,
      });

      if (!created.ok) throw new Error(`setup: saveDocument ${created.error}`);
      return { documentId: String(created.value.documentId), supplierRef };
    };

    it('CI1: refs vazio → ok([])', async () => {
      const view = createDrizzleDocumentSummaryByIdsView(handle);
      const r = await view.getDocumentsSummaryByIds([]);
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.length, 0);
    });

    it('CI2: supplierRef com linha em fin_supplier_view → LEFT JOIN resolve supplierName/supplierDocument', async () => {
      const { documentId, supplierRef } = await seedDocument();

      const supplierStore = createDrizzleSupplierViewStore(handle, ClockReal());
      const upserted = await supplierStore.upsert({
        supplierRef,
        name: 'Fornecedor Conhecido Ltda',
        document: '12345678000199',
        occurredAt: new Date('2026-07-01T00:00:00.000Z'),
      });
      assert.equal(upserted.ok, true, JSON.stringify(upserted));

      const view = createDrizzleDocumentSummaryByIdsView(handle);
      const r = await view.getDocumentsSummaryByIds([documentId]);
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      assert.equal(r.value.length, 1);
      const row = r.value[0];
      assert.equal(row?.documentId, documentId);
      assert.equal(row?.supplierRef, supplierRef);
      assert.equal(row?.status, 'Open');
      // Ponto central do LEFT JOIN: quando fin_supplier_view TEM a linha, os campos vêm preenchidos.
      assert.equal(row?.supplierName, 'Fornecedor Conhecido Ltda');
      assert.equal(row?.supplierDocument, '12345678000199');
      assert.ok(row?.dueDate instanceof Date, 'dueDate deve ser Date');
    });

    it('CI3: supplierRef SEM linha em fin_supplier_view → degradação graciosa (supplierName/supplierDocument null)', async () => {
      const { documentId, supplierRef } = await seedDocument();

      const supplierStore = createDrizzleSupplierViewStore(handle, ClockReal());
      const existing = await supplierStore.get(supplierRef);
      assert.equal(existing.ok, true);
      if (existing.ok) {
        assert.equal(existing.value, null, 'precondição: fornecedor NÃO resolvido no read-model');
      }

      const view = createDrizzleDocumentSummaryByIdsView(handle);
      const r = await view.getDocumentsSummaryByIds([documentId]);
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      assert.equal(r.value.length, 1);
      const row = r.value[0];
      assert.equal(row?.documentId, documentId);
      assert.equal(row?.supplierRef, supplierRef);
      // Sem linha em fin_supplier_view, a projeção degrada para null (ADR-0043) em vez de falhar a query.
      assert.equal(row?.supplierName, null);
      assert.equal(row?.supplierDocument, null);
    });

    it('CI4: ref inexistente misturado a um conhecido → linha inexistente OMITIDA (missing derivado na borda)', async () => {
      const unknown = newUuid();
      const { documentId } = await seedDocument();

      const view = createDrizzleDocumentSummaryByIdsView(handle);
      const r = await view.getDocumentsSummaryByIds([unknown, documentId]);
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      const ids = new Set(r.value.map((row) => row.documentId));
      assert.equal(
        ids.has(unknown),
        false,
        'id inexistente não deve aparecer (nem erro, nem null-row)',
      );
      assert.equal(ids.has(documentId), true, 'id existente deve aparecer');
    });

    it('CI5: documento Paid com TODOS os títulos Reconciled → status derivado = "Reconciled" (ADR-0022)', async () => {
      const { documentId } = await seedDocument();
      // Promove o documento a 'Paid' e o(s) título(s) a 'Reconciled' via SQL direto (não há rota de
      // domínio que o faça — mesmo truque de document-repository.drizzle-mysql.test.ts §displayStatus).
      // Exercita a subquery `recon` + `case when isReconciled` DESTE adapter (não do findPaged).
      await handle.db.execute(sql`UPDATE fin_documents SET status='Paid' WHERE id = ${documentId}`);
      await handle.db.execute(
        sql`UPDATE fin_payables SET status='Reconciled' WHERE document_id = ${documentId}`,
      );

      const view = createDrizzleDocumentSummaryByIdsView(handle);
      const r = await view.getDocumentsSummaryByIds([documentId]);
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      assert.equal(r.value.length, 1);
      // Derivado: Paid + ≥1 título + TODOS Reconciled → 'Reconciled' (sem escrever em fin_documents).
      assert.equal(r.value[0]?.status, 'Reconciled');
    });
  });
}
