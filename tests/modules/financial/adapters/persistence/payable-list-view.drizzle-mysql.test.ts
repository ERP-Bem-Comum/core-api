// Integração (#221): PayableListView Drizzle — JOIN fin_payables ⋈ fin_documents. Semeia um documento
// NFS-e com 1 retenção (ISS) via saveDocument → pai + 1 filho em fin_payables; a query devolve as 2
// linhas com os campos do documento. GATE: MYSQL_INTEGRATION=1 (na lista do runner financial).

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzlePayableListView } from '#src/modules/financial/adapters/persistence/repos/payable-list-view.drizzle.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:payable-list-view] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('#221 — PayableListView (Drizzle + MySQL · JOIN payable⋈documento)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[payable-list-view] conexao: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    it('CA2/CA3: pai + filho como linhas distintas com campos do documento; filtro por fornecedor', async () => {
      const supplierRef = newUuid();
      const documentNumber = `NF-${newUuid().slice(0, 8)}`;
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
        grossValueCents: 1000000,
        retentions: [{ type: 'ISS', baseCents: 350000, rateBps: 1000, valueCents: 35000 }],
        registeredTaxes: [],
        dueDate: new Date('2026-12-31T00:00:00.000Z'),
        description: null,
      });
      assert.equal(created.ok, true, JSON.stringify(created));

      const view = createDrizzlePayableListView(handle);
      const r = await view.findPaged({ supplierRef }, 1, 50);
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      assert.equal(r.value.total, 2); // pai + 1 filho (ISS)
      const parent = r.value.items.find((i) => i.kind === 'Parent');
      const child = r.value.items.find((i) => i.kind === 'Child');
      assert.ok(parent !== undefined, 'esperava o título pai');
      assert.ok(child !== undefined, 'esperava o título filho (ISS)');
      assert.equal(parent?.documentNumber, documentNumber);
      assert.equal(parent?.documentType, 'NFS-e');
      assert.equal(parent?.supplierRef, supplierRef);
      assert.equal(parent?.valueCents, 965000); // 1.000.000 - 35.000 (ISS)
      assert.equal(child?.retentionType, 'ISS');
      assert.equal(child?.valueCents, 35000);
    });
  });
}
