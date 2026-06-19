// CA6 (#124) — integração do lançamento manual (Drizzle + MySQL, migration 0007).
// Unit-of-work: fin_manual_entries + fin_reconciliations + transação `Pending→Reconciled` na mesma tx.
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { createDrizzleReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.drizzle.ts';
import { createDrizzleBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzleCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts';
import { finManualEntries } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { createDrizzleReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.drizzle.ts';
import { recordManualEntry } from '#src/modules/financial/application/use-cases/record-manual-entry.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import { newUuid } from '#src/shared/utils/id.ts';

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:manual-entry] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('ManualEntry — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:manual-entry] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('CA6: recordManualEntry grava fin_manual_entries + transação Reconciled na mesma tx', async () => {
      const cedenteId = CedenteAccountId.generate();
      const account = createCedente({
        id: cedenteId,
        bankCode: '237',
        agency: '1234',
        accountNumber: newUuid().slice(0, 6),
        accountDigit: '1',
        convenio: '9999999',
        document: '12345678000190',
      });
      if (!account.ok) throw new Error('setup: cedente');
      const savedAcc = await createDrizzleCedenteAccountStore(handle).save(account.value);
      assert.equal(savedAcc.ok, true);

      const imported = importStatement(
        {
          debitAccountRef: String(cedenteId),
          period: {
            start: new Date('2024-05-01T00:00:00.000Z'),
            end: new Date('2024-05-31T00:00:00.000Z'),
          },
          file: { name: 'e.ofx', format: 'OFX', hash: `h-${newUuid().slice(0, 8)}` },
          openingBalanceCents: 0,
          closingBalanceCents: 0,
          transactions: [
            {
              fitid: fitidOf(`f-${newUuid().slice(0, 12)}`),
              date: new Date('2024-05-18T00:00:00.000Z'),
              movement: 'Debit',
              entryType: 'Fee',
              payeeName: 'BANCO',
              memo: 'tarifa',
              valueCents: 990,
              balanceAfterCents: 0,
            },
          ],
          occurredAt: new Date('2024-05-19T09:00:00.000Z'),
        },
        new Set(),
      );
      if (!imported.ok) throw new Error('setup: importStatement');
      const statementRepo = createDrizzleBankStatementRepository(handle);
      const savedStmt = await statementRepo.save(imported.value.statement);
      assert.equal(savedStmt.ok, true);
      const txRow = imported.value.statement.transactions[0];
      if (txRow === undefined) throw new Error('setup: tx');
      const txId = String(txRow.id);

      const record = recordManualEntry({
        reconciliationRepo: createDrizzleReconciliationRepository(handle),
        statements: statementRepo,
        cedenteStore: createDrizzleCedenteAccountStore(handle),
        periods: createDrizzleReconciliationPeriodStore(handle),
        clock: ClockReal(),
        outbox: createInMemoryOutbox().port,
      });

      const r = await record({
        transactionId: txId,
        type: 'FeePenaltyInterest',
        reconciledBy: newUuid(),
      });
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      // fin_manual_entries persistido com o valor da transação.
      const rows = await handle.db
        .select()
        .from(finManualEntries)
        .where(eq(finManualEntries.reconciliationId, String(r.value.reconciliationId)));
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.type, 'FeePenaltyInterest');
      assert.equal(rows[0]?.valueCents, 990);

      // Transação marcada Reconciled na mesma tx.
      const tx = await statementRepo.findTransaction(txId);
      assert.equal(tx.ok && tx.value?.transaction.reconciliationStatus === 'Reconciled', true);
    });
  });
}
