// Integração: findPaged resolve fornecedor via LEFT JOIN fin_documents × fin_supplier_view (US2 #47).
// GATE: MYSQL_INTEGRATION=1 (test:integration:financial). Valida o JOIN contra MySQL real.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzleSupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.drizzle.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:list-dto-join] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('findPaged — LEFT JOIN fin_supplier_view (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[list-dto-join] ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    it('item traz supplierName/document quando o read-model tem o supplierRef; null quando não', async () => {
      const refKnown = newUuid();
      const refUnknown = newUuid();
      const store = createDrizzleSupplierViewStore(handle, ClockReal());
      const repo = createDrizzleDocumentRepository(handle);

      await store.upsert({
        supplierRef: refKnown,
        name: 'E2E Fornecedor JOIN',
        document: '11222333000181',
        occurredAt: new Date('2026-06-16T12:00:00.000Z'),
      });

      const mkDoc = (ref: string): Document.CreateDocumentOutput => {
        const supplier = SupplierRef.rehydrate(ref);
        if (!supplier.ok) throw new Error('supplier');
        const gross = Money.fromCents(100000);
        if (!gross.ok) throw new Error('money');
        const created = Document.create({
          id: DocumentId.generate(),
          documentNumber: 'NFS-JOIN',
          type: 'NFS-e',
          supplier: supplier.value,
          paymentMethod: 'TED',
          grossValue: gross.value,
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [],
          registeredTaxes: [],
          dueDate: new Date('2026-07-01'),
        });
        if (!created.ok) throw new Error('create');
        return created.value;
      };

      const known = mkDoc(refKnown);
      const unknown = mkDoc(refUnknown);
      assert.equal(
        (await repo.save({ document: known.document, payables: known.payables }, [])).ok,
        true,
      );
      assert.equal(
        (await repo.save({ document: unknown.document, payables: unknown.payables }, [])).ok,
        true,
      );

      const knownPage = await repo.findPaged({ supplierRef: refKnown }, 1, 10);
      assert.equal(isOk(knownPage), true);
      if (knownPage.ok) {
        const item = knownPage.value.items[0];
        assert.equal(item?.supplierName, 'E2E Fornecedor JOIN');
        assert.equal(item?.supplierDocument, '11222333000181');
      }

      const unknownPage = await repo.findPaged({ supplierRef: refUnknown }, 1, 10);
      if (unknownPage.ok) {
        const item = unknownPage.value.items[0];
        assert.equal(item?.supplierName, null);
        assert.equal(item?.supplierDocument, null);
      }
    });
  });
}
