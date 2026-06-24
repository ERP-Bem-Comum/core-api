// CA7 (#125) — integração do período (Drizzle + MySQL, migration 0008). Close persiste (UNIQUE),
// `isClosed` (guard R18) responde por data, export lê o período.
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { createDrizzleBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzleReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.drizzle.ts';
import { reconciliationExporter } from '#src/modules/financial/adapters/export/reconciliation-exporter.ts';
import { closeReconciliationPeriod } from '#src/modules/financial/application/use-cases/close-reconciliation-period.ts';
import { reopenReconciliationPeriod } from '#src/modules/financial/application/use-cases/reopen-reconciliation-period.ts';
import { exportReconciliation } from '#src/modules/financial/application/use-cases/export-reconciliation.ts';
import { newUuid } from '#src/shared/utils/id.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:reconciliation-period] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('ReconciliationPeriod — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:reconciliation-period] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('CA7: close persiste; isClosed responde por data; re-close viola UNIQUE; export lê', async () => {
      const account = newUuid();
      const start = new Date('2024-05-01T00:00:00.000Z');
      const end = new Date('2024-05-31T00:00:00.000Z');
      const statements = createDrizzleBankStatementRepository(handle);
      const periodStore = createDrizzleReconciliationPeriodStore(handle);

      const close = closeReconciliationPeriod({
        periodStore,
        statements,
        clock: ClockReal(),
      });

      // Período vazio (sem transações) → fecha.
      const closed = await close({
        debitAccountRef: account,
        periodStart: start,
        periodEnd: end,
        closedBy: newUuid(),
      });
      assert.equal(closed.ok, true, JSON.stringify(closed));
      if (!closed.ok) return;

      // Guard R18: data dentro do período fechado → true; fora → false.
      const inside = await periodStore.isClosed(account, new Date('2024-05-18T00:00:00.000Z'));
      assert.equal(inside.ok && inside.value, true);
      const outside = await periodStore.isClosed(account, new Date('2024-07-01T00:00:00.000Z'));
      assert.equal(outside.ok && !outside.value, true);

      // Re-fechar o MESMO período (conta+range) → viola UNIQUE → store-failure.
      const again = await close({
        debitAccountRef: account,
        periodStart: start,
        periodEnd: end,
        closedBy: newUuid(),
      });
      assert.equal(again.ok, false);
      if (!again.ok) assert.equal(again.error, 'reconciliation-period-store-failure');

      // Export lê o período persistido.
      const exported = await exportReconciliation({
        periodStore,
        statements,
        exporter: reconciliationExporter,
      })({
        periodId: String(closed.value.periodId),
        format: 'csv',
      });
      assert.equal(exported.ok, true, JSON.stringify(exported));
      if (exported.ok) assert.match(exported.value.content, /data;fitid;movimento/);
    });

    it('#203: reopen Closed→Open zera closed_at/closed_by; isClosed volta a false; reopen de já-Open → period-not-closed', async () => {
      const account = newUuid();
      const start = new Date('2024-09-01T00:00:00.000Z');
      const end = new Date('2024-09-30T00:00:00.000Z');
      const statements = createDrizzleBankStatementRepository(handle);
      const periodStore = createDrizzleReconciliationPeriodStore(handle);

      const closed = await closeReconciliationPeriod({
        periodStore,
        statements,
        clock: ClockReal(),
      })({
        debitAccountRef: account,
        periodStart: start,
        periodEnd: end,
        closedBy: newUuid(),
      });
      assert.equal(closed.ok, true, JSON.stringify(closed));
      if (!closed.ok) return;

      const reopen = reopenReconciliationPeriod({ periodStore, clock: ClockReal() });
      const reopened = await reopen({
        periodId: String(closed.value.periodId),
        reopenedBy: newUuid(),
      });
      assert.equal(reopened.ok, true, JSON.stringify(reopened));
      if (reopened.ok) assert.equal(reopened.value.status, 'Open');

      // closed_at/closed_by zerados → status Open persistido.
      const persisted = await periodStore.findById(closed.value.periodId);
      assert.equal(persisted.ok && persisted.value?.status === 'Open', true);
      assert.equal(persisted.ok && persisted.value?.closedAt === null, true);
      assert.equal(persisted.ok && persisted.value?.closedBy === null, true);

      // Guard R18 não mais ativo no range (período aberto).
      const inside = await periodStore.isClosed(account, new Date('2024-09-15T00:00:00.000Z'));
      assert.equal(inside.ok && !inside.value, true);

      // Reabrir período já-aberto → domínio rejeita.
      const again = await reopen({
        periodId: String(closed.value.periodId),
        reopenedBy: newUuid(),
      });
      assert.equal(again.ok, false);
      if (!again.ok) assert.equal(again.error, 'period-not-closed');
    });
  });
}
