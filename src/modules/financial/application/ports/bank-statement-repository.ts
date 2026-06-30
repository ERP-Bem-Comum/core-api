import type { Result } from '../../../../shared/primitives/result.ts';
import type { BankStatement, StatementTransaction } from '../../domain/statement/types.ts';
import type { BankStatementEvent } from '../../domain/statement/events.ts';

// Port de persistência do extrato (US1 conciliação). `knownFitids` é a consulta de anti-duplicidade
// (R5): dado um conjunto de FITID candidatos, devolve os já presentes para a conta-débito — o domínio
// usa isso para descartar duplicatas. `listTransactions` devolve `null` quando o extrato não existe.
export type BankStatementRepositoryError = 'bank-statement-repository-failure';

export type BankStatementRepository = Readonly<{
  // `events` (#127): eventos gravados no `fin_outbox` NA MESMA tx do agregado (atomicidade — ADR-0015).
  // Opcional/trailing para back-compat (seeds passam nada; sem append).
  save: (
    statement: BankStatement,
    events?: readonly BankStatementEvent[],
  ) => Promise<Result<void, BankStatementRepositoryError>>;
  knownFitids: (
    debitAccountRef: string,
    fitids: readonly string[],
  ) => Promise<Result<ReadonlySet<string>, BankStatementRepositoryError>>;
  listTransactions: (
    statementId: string,
  ) => Promise<Result<readonly StatementTransaction[] | null, BankStatementRepositoryError>>;
  // Localiza uma transação por id, com o `debit_account_ref` da raiz (desnormalizado) — base da
  // conciliação (#123): fornece valor + conta para o guard FR-015 e a checagem de status `Pending`.
  findTransaction: (
    transactionId: string,
  ) => Promise<
    Result<
      Readonly<{ transaction: StatementTransaction; debitAccountRef: string }> | null,
      BankStatementRepositoryError
    >
  >;
  // Transações de uma conta-débito num intervalo de datas (US6): base do fechamento de período
  // (contar `Pending`) e do export (listar conciliadas). Usa o `debit_account_ref` desnormalizado.
  listTransactionsByPeriod: (
    debitAccountRef: string,
    periodStart: Date,
    periodEnd: Date,
  ) => Promise<Result<readonly StatementTransaction[], BankStatementRepositoryError>>;
}>;
