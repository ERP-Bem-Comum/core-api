import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Reconciliation } from '#src/modules/financial/domain/reconciliation/types.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { StatementTransactionId } from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '#src/modules/financial/application/ports/reconciliation-repository.ts';
import type { BankStatementStore } from './bank-statement-repository.in-memory.ts';
import type { PayableStore } from './payable-reconciliation-view.in-memory.ts';

export type ReconciliationStore = Map<string, Reconciliation>;

export type InMemoryReconciliationStores = Readonly<{
  reconciliations?: ReconciliationStore;
  payables: PayableStore;
  statements: BankStatementStore;
}>;

// Flipa o status de uma transação no statementStore compartilhado (reconstruindo o statement imutável).
// Retorna false se a transação não existe ou não está no status `from` esperado.
const flipTransaction = (
  statements: BankStatementStore,
  transactionId: string,
  from: 'Pending' | 'Reconciled',
  to: 'Pending' | 'Reconciled',
): boolean => {
  for (const [sid, statement] of statements) {
    const idx = statement.transactions.findIndex((t) => String(t.id) === transactionId);
    if (idx < 0) continue;
    const tx = statement.transactions[idx];
    if (tx?.reconciliationStatus !== from) return false;
    const transactions = statement.transactions.map((t, i) =>
      i === idx ? { ...t, reconciliationStatus: to } : t,
    );
    statements.set(sid, { ...statement, transactions });
    return true;
  }
  return false;
};

// Unit-of-work in-memory: espelha a atomicidade do adapter Drizzle sobre stores compartilhados.
export const createInMemoryReconciliationRepository = (
  stores: InMemoryReconciliationStores,
): ReconciliationRepository => {
  const reconciliations = stores.reconciliations ?? new Map<string, Reconciliation>();
  const { payables, statements } = stores;

  return {
    confirm: async (
      reconciliation: Reconciliation,
      transactionId: StatementTransactionId,
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      for (const item of reconciliation.items) {
        const rec = payables.get(String(item.payableId));
        if (rec?.status !== 'Paid') {
          return Promise.resolve(err('reconciliation-repository-failure'));
        }
      }
      if (!flipTransaction(statements, String(transactionId), 'Pending', 'Reconciled')) {
        return Promise.resolve(err('reconciliation-repository-failure'));
      }
      for (const item of reconciliation.items) {
        const rec = payables.get(String(item.payableId));
        if (rec !== undefined)
          payables.set(String(item.payableId), { ...rec, status: 'Reconciled' });
      }
      reconciliations.set(String(reconciliation.id), reconciliation);
      return Promise.resolve(ok(undefined));
    },

    confirmManualEntry: async (
      reconciliation: Reconciliation,
      transactionId: StatementTransactionId,
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      // Lançamento manual: sem título → só flipa a transação e guarda a conciliação (com manualEntry).
      if (!flipTransaction(statements, String(transactionId), 'Pending', 'Reconciled')) {
        return Promise.resolve(err('reconciliation-repository-failure'));
      }
      reconciliations.set(String(reconciliation.id), reconciliation);
      return Promise.resolve(ok(undefined));
    },

    findById: async (
      id: ReconciliationId,
    ): Promise<Result<Reconciliation | null, ReconciliationRepositoryError>> =>
      Promise.resolve(ok(reconciliations.get(String(id)) ?? null)),

    findActiveByTransaction: async (
      transactionId: StatementTransactionId,
    ): Promise<Result<Reconciliation | null, ReconciliationRepositoryError>> => {
      for (const rec of reconciliations.values()) {
        if (rec.status === 'Active' && String(rec.transactionId) === String(transactionId)) {
          return Promise.resolve(ok(rec));
        }
      }
      return Promise.resolve(ok(null));
    },

    undo: async (
      reconciliation: Reconciliation,
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      for (const item of reconciliation.items) {
        const rec = payables.get(String(item.payableId));
        if (rec?.status === 'Reconciled') {
          payables.set(String(item.payableId), { ...rec, status: 'Paid' });
        }
      }
      flipTransaction(statements, String(reconciliation.transactionId), 'Reconciled', 'Pending');
      reconciliations.set(String(reconciliation.id), reconciliation);
      return Promise.resolve(ok(undefined));
    },
  };
};
