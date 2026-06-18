import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  BankStatement,
  StatementTransaction,
} from '#src/modules/financial/domain/statement/types.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '#src/modules/financial/application/ports/bank-statement-repository.ts';

// Store compartilhável: o ReconciliationRepository in-memory mexe na mesma referência para flipar o
// status da transação (`Pending↔Reconciled`) — espelha o uso do timelineStore em #120.
export type BankStatementStore = Map<string, BankStatement>;

// Adapter in-memory (testes + composição de memória). Espelha a defesa de dedup do índice único
// `(debit_account_ref, fitid)` varrendo as transações já salvas da conta-débito.
export const createInMemoryBankStatementRepository = (
  statements: BankStatementStore = new Map<string, BankStatement>(),
): BankStatementRepository => {
  return {
    save: async (statement: BankStatement): Promise<Result<void, BankStatementRepositoryError>> => {
      statements.set(statement.id, statement);
      return Promise.resolve(ok(undefined));
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
  };
};
