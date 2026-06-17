// Teste de integração: SupplierViewStore (Drizzle + MySQL real) — read-model de fornecedor (US2 #47).
//
// Consome a CONTRACT SUITE `supplier-view-store.suite.ts` contra MySQL de verdade, validando o
// upsert ON DUPLICATE KEY UPDATE com guard de `occurred_at` (idempotência + fora-de-ordem).
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).
// Espelha `document-repository.drizzle-mysql.test.ts`.

import { describe, before, after } from 'node:test';
import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleSupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.drizzle.ts';
import { supplierViewStoreContract } from './supplier-view-store.suite.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:supplier-view-store] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('SupplierViewStore — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) {
        throw new Error(`[financial:supplier-view-store] Falha ao conectar ao MySQL: ${r.error}`);
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    supplierViewStoreContract(() => createDrizzleSupplierViewStore(handle, ClockReal()));
  });
}
