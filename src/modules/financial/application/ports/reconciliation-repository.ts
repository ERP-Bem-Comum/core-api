import type { Result } from '../../../../shared/primitives/result.ts';
import type { Reconciliation } from '../../domain/reconciliation/types.ts';
import type { ReconciliationId } from '../../domain/reconciliation/reconciliation-id.ts';
import type { StatementTransactionId } from '../../domain/statement/statement-transaction-id.ts';

// Port da conciliação (US2/US3/US4). `confirm`/`undo` são unit-of-work ATÔMICOS (uma transação):
// cruzam agregados dentro do mesmo bounded context — conciliação + status do título + status da
// transação — porque a invariante de negócio exige all-or-nothing (issue #123).
export type ReconciliationRepositoryError = 'reconciliation-repository-failure';

export type ReconciliationRepository = Readonly<{
  // Insere conciliação+itens, `Paid→Reconciled` nos títulos e `Pending→Reconciled` na transação — na mesma tx.
  confirm: (
    reconciliation: Reconciliation,
    transactionId: StatementTransactionId,
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  findById: (
    id: ReconciliationId,
  ) => Promise<Result<Reconciliation | null, ReconciliationRepositoryError>>;
  // `Active→Undone` (preserva registro), `Reconciled→Paid` nos títulos e `Reconciled→Pending` na transação.
  undo: (reconciliation: Reconciliation) => Promise<Result<void, ReconciliationRepositoryError>>;
}>;
