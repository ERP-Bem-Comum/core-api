// Teste de integração e2e: par_outbox (partners) → consumer → fin_supplier_view (financial).
//
// Valida a topologia da US2 #47 ponta a ponta contra MySQL real: append no outbox do partners →
// runOnce do worker genérico com o delivery do composition root → read-model do financial populado.
// GATE: só com MYSQL_INTEGRATION=1 (ver `package.json §test:integration:financial`).

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { runOnce } from '#src/shared/outbox/index.ts';
import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import type { PartnersMysqlHandle } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleOutboxRepository } from '#src/modules/partners/adapters/persistence/repos/outbox-repository.drizzle.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleSupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.drizzle.ts';
import {
  createSupplierProjectionDelivery,
  rowToMessage,
} from '#src/workers/supplier-view-projection/delivery.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[supplier-projection:e2e] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('supplier-view-projection — e2e par_outbox → fin_supplier_view', () => {
    let partners: PartnersMysqlHandle;
    let financial: FinancialMysqlHandle;

    before(async () => {
      const p = await openPartnersMysql({ connectionString, applyMigrations: true });
      if (!p.ok) throw new Error(`[e2e] partners: ${p.error}`);
      partners = p.value;
      const f = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!f.ok) throw new Error(`[e2e] financial: ${f.error}`);
      financial = f.value;
    });

    after(async () => {
      await partners?.close();
      await financial?.close();
    });

    it('SupplierRegistered publicado no par_outbox é projetado no fin_supplier_view', async () => {
      const ref = newUuid();
      const outbox = createDrizzleOutboxRepository(partners);
      const store = createDrizzleSupplierViewStore(financial, ClockReal());
      const delivery = createSupplierProjectionDelivery(store);
      const occurredAt = new Date('2026-06-16T12:00:00.000Z');

      const appended = await outbox.append([
        {
          eventId: newUuid(),
          aggregateId: ref,
          aggregateType: 'Supplier',
          eventType: 'SupplierRegistered',
          occurredAt,
          payload: JSON.stringify({
            supplierRef: ref,
            name: 'E2E Fornecedor',
            document: '11222333000181',
            occurredAt: occurredAt.toISOString(),
          }),
        },
      ]);
      assert.equal(appended.ok, true);

      const processed = await runOnce(
        { outbox, delivery, rowToProcessed: rowToMessage, clock: ClockReal(), tag: '[e2e] ' },
        { batchSize: 10, maxAttempts: 5, pollIntervalMs: 1 },
      );
      assert.equal(processed.ok, true);
      if (processed.ok) assert.equal(processed.value.delivered, 1);

      const got = await store.get(ref);
      assert.equal(got.ok, true);
      if (got.ok) {
        assert.equal(got.value?.name, 'E2E Fornecedor');
        assert.equal(got.value?.document, '11222333000181');
      }
    });
  });
}
