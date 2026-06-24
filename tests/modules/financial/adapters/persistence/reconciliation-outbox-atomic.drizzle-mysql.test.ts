// W0 (024 · #127 · Fatia B) — atomicidade estado+evento da CONCILIAÇÃO (Drizzle + MySQL real).
//
// `ReconciliationRepository.confirm/confirmManualEntry/undo(recon, txId?, events?)` grava o estado E
// os eventos no fin_outbox na MESMA db.transaction (ADR-0015). Caminho feliz → evento durável; falha
// no outbox → a unit-of-work inteira reverte (título/transação preservam o estado, fin_outbox == 0).
//
// GATE: MYSQL_INTEGRATION=1 (na lista do runner financial). ASCII puro.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import { confirm as domainConfirm } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';
import type { ReconciliationEvent } from '#src/modules/financial/domain/reconciliation/events.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzleBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzleCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts';
import { createDrizzleReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.drizzle.ts';
import {
  finOutbox,
  finPayables,
  finReconciliations,
  finStatementTransactions,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:reconciliation-outbox-atomic] MYSQL_INTEGRATION nao definido — pulando.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('#127 Fatia B — atomicidade conciliacao+evento (Drizzle + MySQL)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[reconciliation-outbox-atomic] conexao: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    const seedPaidPayable = async (valueCents: number): Promise<string> => {
      const save = saveDocument({
        repo: createDrizzleDocumentRepository(handle),
        clock: ClockReal(),
        contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
        cedenteAccountStore: createInMemoryCedenteAccountStore(),
      });
      const created = await save({
        documentNumber: `NFS-${newUuid().slice(0, 8)}`,
        type: 'NFS-e',
        supplierRef: newUuid(),
        paymentMethod: 'PIX',
        grossValueCents: valueCents,
        retentions: [],
        registeredTaxes: [],
        dueDate: new Date('2026-12-31T00:00:00.000Z'),
        description: null,
      });
      if (!created.ok) throw new Error(`setup: saveDocument ${created.error}`);
      const payableId = String(created.value.payableIds[0]);
      await handle.db
        .update(finPayables)
        .set({ status: 'Paid' })
        .where(eq(finPayables.id, payableId));
      return payableId;
    };

    const seedActiveAccount = async (): Promise<string> => {
      const id = CedenteAccountId.generate();
      const account = createCedente({
        id,
        bankCode: '237',
        agency: '1234',
        accountNumber: newUuid().slice(0, 6),
        accountDigit: '1',
        convenio: '9999999',
        document: '12345678000190',
      });
      if (!account.ok) throw new Error('setup: cedente');
      const saved = await createDrizzleCedenteAccountStore(handle).save(account.value);
      if (!saved.ok) throw new Error('setup: cedente save');
      return String(id);
    };

    const seedTransaction = async (cedenteId: string, valueCents: number): Promise<string> => {
      const imported = importStatement(
        {
          debitAccountRef: cedenteId,
          period: {
            start: new Date('2024-05-01T00:00:00.000Z'),
            end: new Date('2024-05-31T00:00:00.000Z'),
          },
          file: { name: 'e.ofx', format: 'OFX', hash: `h-${newUuid().slice(0, 8)}` },
          openingBalanceCents: 0,
          closingBalanceCents: valueCents,
          transactions: [
            {
              fitid: fitidOf(`f-${newUuid().slice(0, 12)}`),
              date: new Date('2024-05-18T00:00:00.000Z'),
              movement: 'Debit',
              entryType: 'TED',
              payeeName: 'FORNECEDOR X',
              memo: 'pagamento',
              valueCents,
              balanceAfterCents: 0,
            },
          ],
          occurredAt: new Date('2024-05-19T09:00:00.000Z'),
        },
        new Set(),
      );
      if (!imported.ok) throw new Error('setup: importStatement');
      const saved = await createDrizzleBankStatementRepository(handle).save(
        imported.value.statement,
      );
      if (!saved.ok) throw new Error('setup: statement save');
      const tx = imported.value.statement.transactions[0];
      if (tx === undefined) throw new Error('setup: tx');
      return String(tx.id);
    };

    const buildRecon = (transactionId: string, payableId: string, valueCents: number) => {
      const txIdR = StatementTransactionId.rehydrate(transactionId);
      if (!txIdR.ok) throw new Error('setup: txId');
      const payIdR = PayableId.rehydrate(payableId);
      if (!payIdR.ok) throw new Error('setup: payableId');
      const out = domainConfirm({
        reconciliationId: ReconciliationId.generate(),
        transactionId: txIdR.value,
        transactionValueCents: valueCents,
        payables: [{ id: payIdR.value, status: 'Paid', valueCents }],
        reconciledBy: 'u1',
        occurredAt: new Date('2024-05-20T12:00:00.000Z'),
      });
      if (!out.ok) throw new Error(`setup: domainConfirm ${out.error}`);
      return out.value;
    };

    const outboxCount = async (reconId: string): Promise<number> => {
      const rows = await handle.db
        .select()
        .from(finOutbox)
        .where(eq(finOutbox.aggregateId, reconId));
      return rows.length;
    };
    const payableStatus = async (id: string): Promise<string | undefined> => {
      const rows = await handle.db.select().from(finPayables).where(eq(finPayables.id, id));
      return rows[0]?.status;
    };
    const txStatus = async (id: string): Promise<string | undefined> => {
      const rows = await handle.db
        .select()
        .from(finStatementTransactions)
        .where(eq(finStatementTransactions.id, id));
      return rows[0]?.reconciliationStatus;
    };
    const reconExists = async (id: string): Promise<boolean> => {
      const rows = await handle.db
        .select()
        .from(finReconciliations)
        .where(eq(finReconciliations.id, id));
      return rows.length === 1;
    };

    it('CA2 sucesso: confirm com evento grava conciliacao E linha no fin_outbox (mesma tx)', async () => {
      const cedenteId = await seedActiveAccount();
      const payableId = await seedPaidPayable(1000);
      const txId = await seedTransaction(cedenteId, 1000);
      const { reconciliation, events } = buildRecon(txId, payableId, 1000);
      const reconId = String(reconciliation.id);

      const repo = createDrizzleReconciliationRepository(handle);
      const saved = await repo.confirm(reconciliation, reconciliation.transactionId, events);

      assert.equal(saved.ok, true, 'confirm deve suceder');
      assert.equal(await reconExists(reconId), true, 'conciliacao persistida');
      assert.equal(await outboxCount(reconId), events.length, 'evento(s) no fin_outbox');
      assert.equal(await payableStatus(payableId), 'Reconciled', 'titulo Reconciled');
      assert.equal(await txStatus(txId), 'Reconciled', 'transacao Reconciled');
    });

    it('CA3 falha: evento malformado (event_type vazio) reverte a tx (COUNT == baseline)', async () => {
      const cedenteId = await seedActiveAccount();
      const payableId = await seedPaidPayable(1000);
      const txId = await seedTransaction(cedenteId, 1000);
      const { reconciliation } = buildRecon(txId, payableId, 1000);
      const reconId = String(reconciliation.id);
      // Evento malformado → CHECK fin_outbox_event_type_nonempty_chk rejeita o INSERT do outbox.
      const badEvent = {
        type: '',
        reconciliationId: reconciliation.id,
      } as unknown as ReconciliationEvent;

      const repo = createDrizzleReconciliationRepository(handle);
      const saved = await repo.confirm(reconciliation, reconciliation.transactionId, [badEvent]);

      assert.equal(saved.ok, false, 'confirm deve falhar (outbox rejeitado)');
      assert.equal(await reconExists(reconId), false, 'conciliacao NAO persiste (rollback)');
      assert.equal(await outboxCount(reconId), 0, 'nenhuma linha no fin_outbox (rollback)');
      assert.equal(await payableStatus(payableId), 'Paid', 'titulo preserva Paid (rollback)');
      assert.equal(await txStatus(txId), 'Pending', 'transacao preserva Pending (rollback)');
    });
  });
}
