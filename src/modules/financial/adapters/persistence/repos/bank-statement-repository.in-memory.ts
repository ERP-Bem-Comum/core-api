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
import type { FinancialOutbox } from '#src/modules/financial/application/ports/outbox.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';

// Store compartilhável: o ReconciliationRepository in-memory mexe na mesma referência para flipar o
// status da transação (`Pending↔Reconciled`) — espelha o uso do timelineStore em #120.
export type BankStatementStore = Map<string, BankStatement>;

// Adapter in-memory (testes + composição de memória). Espelha a defesa de dedup do índice único
// `(debit_account_ref, fitid)` varrendo as transações já salvas da conta-débito.
export const createInMemoryBankStatementRepository = (
  statements: BankStatementStore = new Map<string, BankStatement>(),
  // #127: outbox onde os eventos são "publicados" — paridade in-memory da atomicidade do Drizzle.
  outbox: FinancialOutbox = createInMemoryOutbox().port,
): BankStatementRepository => {
  return {
    save: async (
      statement: BankStatement,
      events?: readonly BankStatementEvent[],
    ): Promise<Result<void, BankStatementRepositoryError>> => {
      // #127 — atomicidade: publica ANTES de persistir; falha no outbox → não persiste.
      if (events !== undefined && events.length > 0) {
        const appended = await outbox.append(events);
        if (!appended.ok) return err('bank-statement-repository-failure');
      }
      statements.set(statement.id, statement);
      return ok(undefined);
    },

    knownFitids: async (
      debitAccountRef: string,
      fitids: readonly string[],
    ): Promise<Result<ReadonlySet<string>, BankStatementRepositoryError>> => {
      const candidate = new Set<string>(fitids);
      const known = new Set<string>();
      for (const statement of statements.values()) {
        if (statement.debitAccountRef !== debitAccountRef) continue;
        for (const tx of statement.transactions) {
          if (candidate.has(tx.fitid)) known.add(tx.fitid);
        }
      }
      return Promise.resolve(ok(known));
    },

    listTransactions: async (
      statementId: string,
    ): Promise<Result<readonly StatementTransaction[] | null, BankStatementRepositoryError>> => {
      const statement = statements.get(statementId);
      if (statement === undefined) return Promise.resolve(ok(null));
      return Promise.resolve(ok(statement.transactions));
    },

    findTransaction: async (
      transactionId: string,
    ): Promise<
      Result<
        Readonly<{ transaction: StatementTransaction; debitAccountRef: string }> | null,
        BankStatementRepositoryError
      >
    > => {
      for (const statement of statements.values()) {
        const transaction = statement.transactions.find((t) => t.id === transactionId);
        if (transaction !== undefined) {
          return Promise.resolve(ok({ transaction, debitAccountRef: statement.debitAccountRef }));
        }
      }
      return Promise.resolve(ok(null));
    },

    listTransactionsByPeriod: async (
      debitAccountRef: string,
      periodStart: Date,
      periodEnd: Date,
    ): Promise<Result<readonly StatementTransaction[], BankStatementRepositoryError>> => {
      const from = periodStart.getTime();
      const to = periodEnd.getTime();
      const found: StatementTransaction[] = [];
      for (const statement of statements.values()) {
        if (statement.debitAccountRef !== debitAccountRef) continue;
        for (const tx of statement.transactions) {
          const at = tx.date.getTime();
          if (at >= from && at <= to) found.push(tx);
        }
      }
      return Promise.resolve(ok(found));
    },

    deleteById: async (
      statementId: string,
    ): Promise<Result<void, BankStatementRepositoryError>> => {
      statements.delete(statementId); // idempotente: inexistente → no-op
      return ok(undefined);
    },
  };
};
