// Integração e2e do backfill (#236): fin_payables (fonte) → readPayableBackfillRecords →
// backfillPayableViews → fin_payable_view. Valida o SELECT/JOIN + mapeamento de status contra MySQL
// real. GATE: só com MYSQL_INTEGRATION=1.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import * as Money from '#src/shared/kernel/money.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzlePayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.drizzle.ts';
import { readPayableBackfillRecords } from '#src/jobs/financial/payable-view-backfill/reader.ts';
import { backfillPayableViews } from '#src/jobs/financial/payable-view-backfill/backfill.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[payable-view-backfill:e2e] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('payable-view-backfill — e2e fin_payables → fin_payable_view', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[backfill:e2e] financial: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    it('um documento Open na fonte é backfilled em fin_payable_view', async () => {
      const supplierR = SupplierRef.rehydrate('11111111-1111-4111-8111-111111111111');
      const grossR = Money.fromCents(100000);
      if (!supplierR.ok || !grossR.ok) throw new Error('setup');
      const created = Document.create({
        id: DocumentId.generate(),
        documentNumber: `BACKFILL-${Date.now().toString(36)}`,
        type: 'NFS-e',
        supplier: supplierR.value,
        paymentMethod: 'TED',
        grossValue: grossR.value,
        sourceDiscounts: Money.ZERO,
        discounts: Money.ZERO,
        penalty: Money.ZERO,
        interest: Money.ZERO,
        retentions: [],
        registeredTaxes: [],
        dueDate: new Date('2026-07-01'),
      });
      if (!created.ok) throw new Error('setup: create');
      const parentId = String(created.value.payables.parent.id);

      const repo = createDrizzleDocumentRepository(handle);
      const saved = await repo.save(
        { document: created.value.document, payables: created.value.payables },
        [],
        undefined,
        created.value.events,
      );
      assert.equal(saved.ok, true);

      const source = await readPayableBackfillRecords(handle);
      assert.equal(source.ok, true);
      if (!source.ok) return;
      const rec = source.value.records.find((r) => r.payableId === parentId);
      assert.ok(rec, 'esperava o título pai na leitura da fonte');
      assert.equal(rec.valueCents, 100000);
      assert.equal(rec.status, 'Open');

      const store = createDrizzlePayableViewStore(handle, ClockReal());
      const result = await backfillPayableViews(source.value.records, store);
      assert.equal(result.ok, true);

      // idempotência no banco: rerodar não duplica.
      await backfillPayableViews(source.value.records, store);

      const list = await store.list();
      assert.equal(list.ok, true);
      if (list.ok) {
        const rows = list.value.filter((r) => r.payableId === parentId);
        assert.equal(rows.length, 1, 'backfill idempotente — 1 linha por payable');
        assert.equal(rows[0]?.status, 'Open');
      }
    });
  });
}
