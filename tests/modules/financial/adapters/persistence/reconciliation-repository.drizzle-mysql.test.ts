// CA11 (#123) — integração da conciliação (Drizzle + MySQL real, migration 0006).
//
// Valida o unit-of-work atômico: confirm grava conciliação+itens, flipa título `Paid→Reconciled` e
// transação `Pending→Reconciled` na MESMA tx; undo reverte tudo. Semeia um título real via
// `saveDocument` (FK fin_payables→fin_documents) e o promove a `Paid` por SQL (simula a 016).
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzleBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzleCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts';
import { createDrizzlePayableReconciliationView } from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.drizzle.ts';
import { createDrizzleReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.drizzle.ts';
import { createDrizzleExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.drizzle.ts';
import { createDrizzleReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.drizzle.ts';
import {
  finCedenteAccounts,
  finPayables,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import { undoReconciliation } from '#src/modules/financial/application/use-cases/undo-reconciliation.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:reconciliation-repo] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('Reconciliation — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:reconciliation-repo] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    // Cria um documento Open (1 título Pai, sem retenção → valor líquido = bruto), promove o título a
    // `Paid` por SQL e devolve { payableId, valueCents }.
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
      // paid_at obrigatório junto de status='Paid' (CHECK fin_payables_paid_at_chk, #383).
      await handle.db
        .update(finPayables)
        .set({ status: 'Paid', paidAt: new Date('2026-07-01T00:00:00.000Z') })
        .where(eq(finPayables.id, payableId));
      return payableId;
    };

    // Importa um extrato com 1 transação Pending de `valueCents` para a conta `cedenteId`; devolve txId.
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

    const deps = () => ({
      reconciliationRepo: createDrizzleReconciliationRepository(handle),
      payables: createDrizzlePayableReconciliationView(handle),
      statements: createDrizzleBankStatementRepository(handle),
      cedenteStore: createDrizzleCedenteAccountStore(handle),
      periods: createDrizzleReconciliationPeriodStore(handle),
      clock: ClockReal(),
      outbox: createInMemoryOutbox().port,
      expectedCounterpartStore: createDrizzleExpectedCounterpartStore(handle),
    });

    it('CA11: confirm grava e flipa título+transação na mesma tx; undo reverte tudo', async () => {
      const cedenteId = await seedActiveAccount();
      const payableId = await seedPaidPayable(1000);
      const txId = await seedTransaction(cedenteId, 1000);

      const d = deps();
      const confirmed = await confirmReconciliation(d)({
        transactionId: txId,
        payableIds: [payableId],
        reconciledBy: '99999999-9999-4999-8999-999999999999',
      });
      assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
      if (!confirmed.ok) return;
      assert.equal(confirmed.value.type, 'Individual');

      // Persistência + flips atômicos.
      const stored = await d.reconciliationRepo.findById(confirmed.value.reconciliationId);
      assert.equal(stored.ok && stored.value !== null, true);
      const snap = await d.payables.findSnapshotsByIds([payableId]);
      assert.equal(snap.ok && snap.value[0]?.status === 'Reconciled', true);
      const tx = await d.statements.findTransaction(txId);
      assert.equal(tx.ok && tx.value?.transaction.reconciliationStatus === 'Reconciled', true);

      // Re-confirmar a mesma transação → já conciliada.
      const again = await confirmReconciliation(d)({
        transactionId: txId,
        payableIds: [payableId],
        reconciledBy: 'u1',
      });
      assert.equal(again.ok, false);
      if (!again.ok) assert.equal(again.error, 'transaction-already-reconciled');

      // Undo reverte: título → Paid, transação → Pending, conciliação → Undone.
      const undone = await undoReconciliation(d)({
        reconciliationId: String(confirmed.value.reconciliationId),
        undoneBy: 'u2',
      });
      assert.equal(undone.ok, true, JSON.stringify(undone));
      const snap2 = await d.payables.findSnapshotsByIds([payableId]);
      assert.equal(snap2.ok && snap2.value[0]?.status === 'Paid', true);
      const tx2 = await d.statements.findTransaction(txId);
      assert.equal(tx2.ok && tx2.value?.transaction.reconciliationStatus === 'Pending', true);
      const stored2 = await d.reconciliationRepo.findById(confirmed.value.reconciliationId);
      assert.equal(stored2.ok && stored2.value?.status === 'Undone', true);
    });

    it('CA11: guard FR-015 — conta encerrada → account-closed, sem efeito colateral', async () => {
      const cedenteId = await seedActiveAccount();
      const payableId = await seedPaidPayable(2000);
      const txId = await seedTransaction(cedenteId, 2000);
      // Encerra a conta (status Closed) via update tipado do schema.
      await handle.db
        .update(finCedenteAccounts)
        .set({ status: 'Closed' })
        .where(eq(finCedenteAccounts.id, cedenteId));

      const d = deps();
      const r = await confirmReconciliation(d)({
        transactionId: txId,
        payableIds: [payableId],
        reconciledBy: 'u1',
      });
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'account-closed');
      // Título permanece Paid; transação permanece Pending.
      const snap = await d.payables.findSnapshotsByIds([payableId]);
      assert.equal(snap.ok && snap.value[0]?.status === 'Paid', true);
      const tx = await d.statements.findTransaction(txId);
      assert.equal(tx.ok && tx.value?.transaction.reconciliationStatus === 'Pending', true);
    });
  });
}
