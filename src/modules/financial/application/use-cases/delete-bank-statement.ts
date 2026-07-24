import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';

// Exclui um extrato importado (OFX/PDF/CSV — já normalizado). GUARDA, sem cascata (decisão P.O.):
// só exclui se o extrato existe, NENHUMA transação está conciliada e o período NÃO está fechado.
// Conciliada/período fechado → o usuário desfaz/reabre pelos fluxos existentes e tenta de novo.
// O hard delete apaga as transações por FK cascade (fin_statement_transactions → fin_bank_statements).

export type DeleteBankStatementDeps = Readonly<{
  repo: Pick<BankStatementRepository, 'listTransactions' | 'findTransaction' | 'deleteById'>;
  periods: Pick<ReconciliationPeriodStore, 'isClosed'>;
}>;

export type DeleteBankStatementInput = Readonly<{ statementId: string }>;

export type DeleteBankStatementError =
  | 'bank-statement-not-found'
  | 'statement-has-reconciled-transactions'
  | 'period-closed'
  | BankStatementRepositoryError
  | ReconciliationPeriodStoreError;

export const deleteBankStatement =
  (deps: DeleteBankStatementDeps) =>
  async (input: DeleteBankStatementInput): Promise<Result<void, DeleteBankStatementError>> => {
    const txsR = await deps.repo.listTransactions(input.statementId);
    if (!txsR.ok) return err(txsR.error);
    if (txsR.value === null) return err('bank-statement-not-found');
    const transactions = txsR.value;

    // Guarda 1: qualquer transação conciliada (Reconciled/ManualEntry) bloqueia — desfaça antes.
    if (transactions.some((t) => t.reconciliationStatus !== 'Pending')) {
      return err('statement-has-reconciled-transactions');
    }

    // Guarda 2: período fechado bloqueia — reabra antes. O `debitAccountRef` da raiz vem via
    // findTransaction (desnormalizado); qualquer data do período serve para a checagem.
    const first = transactions[0];
    if (first !== undefined) {
      const ftR = await deps.repo.findTransaction(String(first.id));
      if (!ftR.ok) return err(ftR.error);
      if (ftR.value !== null) {
        const closedR = await deps.periods.isClosed(ftR.value.debitAccountRef, first.date);
        if (!closedR.ok) return err(closedR.error);
        if (closedR.value) return err('period-closed');
      }
    }

    const deleted = await deps.repo.deleteById(input.statementId);
    if (!deleted.ok) return err(deleted.error);
    return ok(undefined);
  };
