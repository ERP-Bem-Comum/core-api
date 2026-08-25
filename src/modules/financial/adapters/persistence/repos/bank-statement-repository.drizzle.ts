// Adapter Drizzle do BankStatementRepository (MySQL). `save` insere raiz + transações na MESMA
// transação (boundary do agregado); o índice único `(debit_account_ref, fitid)` é a defesa final de
// anti-duplicidade (R5) — uma transação duplicada faz o INSERT falhar e o save retorna erro.
// Boundary: todo try/catch converte para Result; nenhum Error cruza (.claude/rules/adapters.md).

import { and, between, eq, inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  BankStatement,
  StatementTransaction,
} from '#src/modules/financial/domain/statement/types.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '#src/modules/financial/application/ports/bank-statement-repository.ts';
import type { BankStatementEvent } from '#src/modules/financial/domain/statement/events.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finBankStatements, finStatementTransactions } from '../schemas/mysql.ts';
import {
  statementToRow,
  transactionsToRows,
  toDomain,
  transactionRowToDomain,
} from '../mappers/statement.mapper.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-bank-statement-repo] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzleBankStatementRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): BankStatementRepository => {
  const { db } = handle;

  return {
    save: async (
      statement: BankStatement,
      events?: readonly BankStatementEvent[],
    ): Promise<Result<void, BankStatementRepositoryError>> => {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(finBankStatements).values(statementToRow(statement));
          const txRows = transactionsToRows(statement);
          if (txRows.length > 0) {
            await tx.insert(finStatementTransactions).values(txRows);
          }
          // #127: estado + evento na MESMA tx (atomicidade — ADR-0015). Falha aqui reverte tudo.
          await appendFinOutboxInTx(tx, events ?? []);
        });
        return ok(undefined);
      } catch (cause) {
        logStore('save', cause);
        return err('bank-statement-repository-failure');
      }
    },

    knownFitids: async (
      debitAccountRef: string,
      fitids: readonly string[],
    ): Promise<Result<ReadonlySet<string>, BankStatementRepositoryError>> => {
      if (fitids.length === 0) return ok(new Set<string>());
      try {
        const rows = await db
          .select({ fitid: finStatementTransactions.fitid })
          .from(finStatementTransactions)
          .where(
            and(
              eq(finStatementTransactions.debitAccountRef, debitAccountRef),
              inArray(finStatementTransactions.fitid, [...fitids]),
            ),
          );
        return ok(new Set(rows.map((r) => r.fitid)));
      } catch (cause) {
        logStore('knownFitids', cause);
        return err('bank-statement-repository-failure');
      }
    },

    listTransactions: async (
      statementId: string,
    ): Promise<Result<readonly StatementTransaction[] | null, BankStatementRepositoryError>> => {
      try {
        const stRows = await db
          .select()
          .from(finBankStatements)
          .where(eq(finBankStatements.id, statementId))
          .limit(1);
        const stRow = stRows[0];
        if (stRow === undefined) return ok(null);

        const txRows = await db
          .select()
          .from(finStatementTransactions)
          .where(eq(finStatementTransactions.statementId, statementId));

        const mapped = toDomain(stRow, txRows);
        if (!mapped.ok) {
          logStore('listTransactions:map', mapped.error);
          return err('bank-statement-repository-failure');
        }
        return ok(mapped.value.transactions);
      } catch (cause) {
        logStore('listTransactions', cause);
        return err('bank-statement-repository-failure');
      }
    },

    findTransaction: async (
      transactionId: string,
    ): Promise<
      Result<
        Readonly<{ transaction: StatementTransaction; debitAccountRef: string }> | null,
        BankStatementRepositoryError
      >
    > => {
      try {
        const rows = await db
          .select()
          .from(finStatementTransactions)
          .where(eq(finStatementTransactions.id, transactionId))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = transactionRowToDomain(row);
        if (!mapped.ok) {
          logStore('findTransaction:map', mapped.error);
          return err('bank-statement-repository-failure');
        }
        return ok({ transaction: mapped.value, debitAccountRef: row.debitAccountRef });
      } catch (cause) {
        logStore('findTransaction', cause);
        return err('bank-statement-repository-failure');
      }
    },

    listTransactionsByPeriod: async (
      debitAccountRef: string,
      periodStart: Date,
      periodEnd: Date,
    ): Promise<Result<readonly StatementTransaction[], BankStatementRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finStatementTransactions)
          .where(
            and(
              eq(finStatementTransactions.debitAccountRef, debitAccountRef),
              between(finStatementTransactions.date, periodStart, periodEnd),
            ),
          );
        const transactions: StatementTransaction[] = [];
        for (const row of rows) {
          const mapped = transactionRowToDomain(row);
          if (!mapped.ok) {
            logStore('listTransactionsByPeriod:map', mapped.error);
            return err('bank-statement-repository-failure');
          }
          transactions.push(mapped.value);
        }
        return ok(transactions);
      } catch (cause) {
        logStore('listTransactionsByPeriod', cause);
        return err('bank-statement-repository-failure');
      }
    },

    deleteById: async (
      statementId: string,
    ): Promise<Result<void, BankStatementRepositoryError>> => {
      try {
        // FK cascade (fin_statement_transactions → fin_bank_statements) apaga as transações.
        await db.delete(finBankStatements).where(eq(finBankStatements.id, statementId));
        return ok(undefined);
      } catch (cause) {
        logStore('deleteById', cause);
        return err('bank-statement-repository-failure');
      }
    },
  };
};
