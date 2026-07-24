// W0 (024 · #127) — atomicidade estado+evento dos agregados Statement e ReconciliationPeriod
// (Drizzle + MySQL real). `BankStatementRepository.save(statement, events?)` e
// `ReconciliationPeriodStore.close(period, events?)` gravam estado E evento no fin_outbox na MESMA
// db.transaction (ADR-0015). Falha no outbox → tx inteira reverte (estado nao persiste, fin_outbox == 0).
//
// GATE: MYSQL_INTEGRATION=1 (na lista do runner financial). ASCII puro.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { newUuid } from '#src/shared/utils/id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as ReconciliationPeriodId from '#src/modules/financial/domain/reconciliation/reconciliation-period-id.ts';
import { closePeriod } from '#src/modules/financial/domain/reconciliation/period.ts';
import type { ReconciliationPeriodClosed } from '#src/modules/financial/domain/reconciliation/period.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import type { BankStatementEvent } from '#src/modules/financial/domain/statement/events.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzleReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.drizzle.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import {
  finBankStatements,
  finOutbox,
  finReconciliationPeriods,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:statement-period-outbox-atomic] MYSQL_INTEGRATION nao definido — pulando.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('#127 — atomicidade statement/period+evento (Drizzle + MySQL)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[statement-period-outbox-atomic] conexao: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    const outboxCount = async (aggregateId: string): Promise<number> => {
      const rows = await handle.db
        .select()
        .from(finOutbox)
        .where(eq(finOutbox.aggregateId, aggregateId));
      return rows.length;
    };
    const statementExists = async (id: string): Promise<boolean> => {
      const rows = await handle.db
        .select()
        .from(finBankStatements)
        .where(eq(finBankStatements.id, id));
      return rows.length === 1;
    };
    const periodExists = async (id: string): Promise<boolean> => {
      const rows = await handle.db
        .select()
        .from(finReconciliationPeriods)
        .where(eq(finReconciliationPeriods.id, id));
      return rows.length === 1;
    };

    const buildStatement = () => {
      const cedenteId = CedenteAccountId.generate();
      const txs: readonly ParsedTransaction[] = [
        {
          fitid: fitidOf(`f-${newUuid().slice(0, 12)}`),
          date: new Date('2024-05-18T00:00:00.000Z'),
          movement: 'Debit',
          entryType: 'TED',
          payeeName: 'FORNECEDOR X',
          memo: 'pagamento',
          valueCents: 1000,
          balanceAfterCents: 0,
        },
      ];
      const imported = importStatement(
        {
          debitAccountRef: String(cedenteId),
          period: {
            start: new Date('2024-05-01T00:00:00.000Z'),
            end: new Date('2024-05-31T00:00:00.000Z'),
          },
          file: { name: 'e.ofx', format: 'OFX', hash: `h-${newUuid().slice(0, 8)}` },
          openingBalanceCents: 0,
          closingBalanceCents: 1000,
          transactions: txs,
          occurredAt: new Date('2024-05-19T09:00:00.000Z'),
        },
        new Set(),
      );
      if (!imported.ok) throw new Error('setup: importStatement');
      return imported.value;
    };

    const buildClosedPeriod = () => {
      const out = closePeriod({
        periodId: ReconciliationPeriodId.generate(),
        debitAccountRef: String(CedenteAccountId.generate()),
        periodStart: new Date('2024-05-01T00:00:00.000Z'),
        periodEnd: new Date('2024-05-31T00:00:00.000Z'),
        hasPendingTransactions: false,
        closedBy: newUuid(),
        occurredAt: new Date('2024-05-31T23:00:00.000Z'),
      });
      if (!out.ok) throw new Error('setup: closePeriod');
      return out.value;
    };

    it('CA2 sucesso: save do extrato grava statement E linha no fin_outbox (mesma tx)', async () => {
      const { statement, events } = buildStatement();
      const id = String(statement.id);
      const repo = createDrizzleBankStatementRepository(handle);

      const saved = await repo.save(statement, events);
      assert.equal(saved.ok, true, 'save deve suceder');
      assert.equal(await statementExists(id), true, 'extrato persistido');
      assert.equal(await outboxCount(id), events.length, 'evento(s) no fin_outbox');
    });

    it('CA3 falha: evento de extrato malformado reverte a tx (COUNT == baseline)', async () => {
      const { statement } = buildStatement();
      const id = String(statement.id);
      const badEvent = { type: '', statementId: statement.id } as unknown as BankStatementEvent;
      const repo = createDrizzleBankStatementRepository(handle);

      const saved = await repo.save(statement, [badEvent]);
      assert.equal(saved.ok, false, 'save deve falhar (outbox rejeitado)');
      assert.equal(await statementExists(id), false, 'extrato NAO persiste (rollback)');
      assert.equal(await outboxCount(id), 0, 'nenhuma linha no fin_outbox (rollback)');
    });

    it('CA2 sucesso: close do periodo grava period E linha no fin_outbox (mesma tx)', async () => {
      const { period, events } = buildClosedPeriod();
      const id = String(period.id);
      const store = createDrizzleReconciliationPeriodStore(handle);

      const saved = await store.close(period, events);
      assert.equal(saved.ok, true, 'close deve suceder');
      assert.equal(await periodExists(id), true, 'periodo persistido');
      assert.equal(await outboxCount(id), events.length, 'evento(s) no fin_outbox');
    });

    it('CA3 falha: evento de periodo malformado reverte a tx (COUNT == baseline)', async () => {
      const { period } = buildClosedPeriod();
      const id = String(period.id);
      const badEvent = {
        type: '',
        periodId: period.id,
      } as unknown as ReconciliationPeriodClosed;
      const store = createDrizzleReconciliationPeriodStore(handle);

      const saved = await store.close(period, [badEvent]);
      assert.equal(saved.ok, false, 'close deve falhar (outbox rejeitado)');
      assert.equal(await periodExists(id), false, 'periodo NAO persiste (rollback)');
      assert.equal(await outboxCount(id), 0, 'nenhuma linha no fin_outbox (rollback)');
    });
  });
}
