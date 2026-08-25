// Integração (#146) — PayableDocumentView (JOIN fin_payables × fin_documents) contra MySQL real.
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzlePayableDocumentView } from '#src/modules/financial/adapters/persistence/repos/payable-document-view.drizzle.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:payable-document-view] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('PayableDocumentView — Drizzle + MySQL (integração) (#146)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:payable-document-view] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    // Semeia um documento com um título Pai e retorna seus IDs.
    const seedDocumentWithPayable = async (opts?: {
      documentNumber?: string;
      supplierRef?: string;
      competencia?: string;
    }): Promise<{ payableId: string; documentId: string }> => {
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

      const payableId = String(created.value.payableIds[0]);
      const documentId = String(created.value.documentId);
      return { payableId, documentId };
    };

    it('CI1: ids vazio → ok([])', async () => {
      const view = createDrizzlePayableDocumentView(handle);
      const r = await view.findByPayableIds([]);
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.length, 0);
    });

    it('CI2: payableId conhecido → JOIN traz campos do documento', async () => {
      const { payableId, documentId } = await seedDocumentWithPayable({
        documentNumber: `NF-VIEW-${newUuid().slice(0, 6)}`,
      });

      const view = createDrizzlePayableDocumentView(handle);
      const r = await view.findByPayableIds([payableId]);
      assert.equal(r.ok, true);
      if (!r.ok) return;

      assert.equal(r.value.length, 1);
      const row = r.value[0];
      assert.equal(row?.payableId, payableId);
      assert.equal(row?.documentId, documentId);
      // dueDate é Date (date mode:'date' no schema)
      assert.ok(row?.dueDate instanceof Date, 'dueDate deve ser Date');
      // documentNumber e supplierRef não são null (semeados)
      assert.ok(row?.documentNumber !== null, 'documentNumber presente');
      assert.ok(row?.supplierRef !== null, 'supplierRef presente');
    });

    it('CI3: payableId inexistente → ausente no resultado (degradação graciosa)', async () => {
      const unknown = newUuid();
      const { payableId } = await seedDocumentWithPayable();

      const view = createDrizzlePayableDocumentView(handle);
      const r = await view.findByPayableIds([unknown, payableId]);
      assert.equal(r.ok, true);
      if (!r.ok) return;

      const ids = new Set(r.value.map((row) => row.payableId));
      assert.equal(ids.has(unknown), false, 'id inexistente não deve aparecer');
      assert.equal(ids.has(payableId), true, 'id existente deve aparecer');
    });

    it('CI4: múltiplos payableIds → todas as linhas correspondentes no resultado', async () => {
      const a = await seedDocumentWithPayable();
      const b = await seedDocumentWithPayable();

      const view = createDrizzlePayableDocumentView(handle);
      const r = await view.findByPayableIds([a.payableId, b.payableId]);
      assert.equal(r.ok, true);
      if (!r.ok) return;

      // Pode haver mais linhas se o banco tiver estado de outros testes, mas os dois semeados
      // devem estar presentes.
      const ids = new Set(r.value.map((row) => row.payableId));
      assert.equal(ids.has(a.payableId), true);
      assert.equal(ids.has(b.payableId), true);
    });
  });
}
