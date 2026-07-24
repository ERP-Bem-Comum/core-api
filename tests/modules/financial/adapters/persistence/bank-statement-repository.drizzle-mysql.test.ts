// CA7 (#120) — integração BankStatementRepository (Drizzle + MySQL real, migration 0005).
// CA5 (#159) — o CHECK `fin_statement_transactions_entry_type_chk` rejeita `entry_type` fora do union.
//
// Valida: (1) save + listTransactions round-trip e knownFitids; (2) o índice ÚNICO
// `(debit_account_ref, fitid)` rejeita FITID duplicado na MESMA conta (defesa de dedup no DB, R5);
// (3) mesma FITID em conta-débito diferente é permitida; (4) o CHECK de `entry_type` é a defesa no DB.
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.drizzle.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import type { ImportStatementInput } from '#src/modules/financial/domain/statement/types.ts';

const buildStatement = (
  account: string,
  fitidRaw: string,
  format: 'OFX' | 'CSV' | 'PDF' = 'OFX',
) => {
  const f = Fitid.fromNative(fitidRaw);
  if (!f.ok) throw new Error('test setup: fitid');
  const input: ImportStatementInput = {
    debitAccountRef: account,
    period: {
      start: new Date('2024-05-01T00:00:00.000Z'),
      end: new Date('2024-05-31T00:00:00.000Z'),
    },
    file: { name: `extrato.${format.toLowerCase()}`, format, hash: `hash-${fitidRaw}` },
    openingBalanceCents: 0,
    closingBalanceCents: 1000,
    transactions: [
      {
        fitid: f.value,
        date: new Date('2024-05-18T00:00:00.000Z'),
        movement: 'Debit',
        entryType: 'TED',
        payeeName: 'FORNECEDOR X',
        memo: 'pagamento',
        valueCents: 1000,
        balanceAfterCents: 0,
      },
    ],
    occurredAt: new Date('2024-05-19T09:00:00.000Z'),
  };
  const r = importStatement(input, new Set());
  if (!r.ok) throw new Error('test setup: importStatement');
  return r.value.statement;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:bank-statement-repo] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('BankStatementRepository — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) {
        throw new Error(`[financial:bank-statement-repo] Falha ao conectar ao MySQL: ${r.error}`);
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('CA7: save + listTransactions round-trip; knownFitids retorna o FITID salvo', async () => {
      const repo = createDrizzleBankStatementRepository(handle);
      const account = '11111111-1111-4111-8111-111111111111';
      const statement = buildStatement(account, 'fitid-rt-1');

      const saved = await repo.save(statement);
      assert.equal(saved.ok, true);

      const listed = await repo.listTransactions(statement.id);
      assert.equal(listed.ok, true);
      if (listed.ok && listed.value !== null) {
        assert.equal(listed.value.length, 1);
        assert.equal(listed.value[0]?.entryType, 'TED');
        assert.equal(listed.value[0]?.reconciliationStatus, 'Pending');
      } else {
        assert.fail('transações não encontradas após save');
      }

      const known = await repo.knownFitids(account, ['fitid-rt-1', 'inexistente']);
      assert.equal(known.ok, true);
      if (known.ok) {
        assert.equal(known.value.has('fitid-rt-1'), true);
        assert.equal(known.value.has('inexistente'), false);
      }
    });

    it('CA7: índice único (debit_account_ref, fitid) rejeita FITID duplicado na mesma conta', async () => {
      const repo = createDrizzleBankStatementRepository(handle);
      const account = '22222222-2222-4222-8222-222222222222';

      const first = await repo.save(buildStatement(account, 'fitid-dup'));
      assert.equal(first.ok, true);

      // Segundo extrato (id distinto) com a MESMA (conta, fitid) → viola o UNIQUE → save falha.
      const second = await repo.save(buildStatement(account, 'fitid-dup'));
      assert.equal(second.ok, false);
      if (!second.ok) assert.equal(second.error, 'bank-statement-repository-failure');
    });

    it('CA7: mesma FITID em conta diferente é permitida', async () => {
      const repo = createDrizzleBankStatementRepository(handle);
      const accountA = '33333333-3333-4333-8333-333333333333';
      const accountB = '44444444-4444-4444-8444-444444444444';

      const a = await repo.save(buildStatement(accountA, 'fitid-shared'));
      const b = await repo.save(buildStatement(accountB, 'fitid-shared'));
      assert.equal(a.ok, true);
      assert.equal(b.ok, true);
    });

    it('CA5 (#159): CHECK rejeita entry_type fora do union no nível do DB', async () => {
      const repo = createDrizzleBankStatementRepository(handle);
      const account = '55555555-5555-4555-8555-555555555555';
      const statement = buildStatement(account, 'fitid-chk-1');
      assert.equal((await repo.save(statement)).ok, true);

      const txId = statement.transactions[0]?.id;
      assert.ok(txId);

      // UPDATE cru bypassa o domínio para provar a defesa no nível do DB (CHECK constraint).
      await assert.rejects(
        () =>
          handle.db.execute(
            sql`UPDATE fin_statement_transactions SET entry_type = 'XPTO' WHERE id = ${txId}`,
          ),
        /entry_type|constraint|check/i,
      );
    });

    it('#559: CHECK aceita file_format PDF (import de extrato PDF persiste)', async () => {
      const repo = createDrizzleBankStatementRepository(handle);
      const account = '66666666-6666-4666-8666-666666666666';
      const statement = buildStatement(account, 'fitid-pdf-1', 'PDF');
      const saved = await repo.save(statement);
      assert.equal(saved.ok, true, JSON.stringify(saved)); // antes do fix: CHECK barrava 'PDF' → 503
    });
  });
}
