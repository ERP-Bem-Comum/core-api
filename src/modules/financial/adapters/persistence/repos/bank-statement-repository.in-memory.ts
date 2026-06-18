import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  BankStatement,
  StatementTransaction,
} from '#src/modules/financial/domain/statement/types.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '#src/modules/financial/application/ports/bank-statement-repository.ts';

// Adapter in-memory (testes + composição de memória). Espelha a defesa de dedup do índice único
// `(debit_account_ref, fitid)` varrendo as transações já salvas da conta-débito.
export const createInMemoryBankStatementRepository = (): BankStatementRepository => {
  const statements = new Map<string, BankStatement>();

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
  };
};
