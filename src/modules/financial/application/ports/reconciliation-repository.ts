import type { Result } from '../../../../shared/primitives/result.ts';
import type { Reconciliation } from '../../domain/reconciliation/types.ts';
import type { ReconciliationId } from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationEvent } from '../../domain/reconciliation/events.ts';
import type { StatementTransactionId } from '../../domain/statement/statement-transaction-id.ts';
import type { ExpectedCounterpart } from '../../domain/expected-counterpart/types.ts';
import type { FinancialAppendableEvent } from './outbox.ts';

// Port da conciliação (US2/US3/US4). `confirm`/`undo` são unit-of-work ATÔMICOS (uma transação):
// cruzam agregados dentro do mesmo bounded context — conciliação + status do título + status da
// transação — porque a invariante de negócio exige all-or-nothing (issue #123).
//
// `events` (#127): eventos de domínio gravados no `fin_outbox` NA MESMA transação da unit-of-work
//   (atomicidade — ADR-0015; evento durável SSE estado persistido). Opcional/trailing para back-compat
//   (callers sem evento — testes de contrato/seed — passam nada; sem append).
export type ReconciliationRepositoryError = 'reconciliation-repository-failure';

export type ReconciliationRepository = Readonly<{
  // Insere conciliação+itens, `Paid→Reconciled` nos títulos e `Pending→Reconciled` na transação — na mesma tx.
  confirm: (
    reconciliation: Reconciliation,
    transactionId: StatementTransactionId,
    events?: readonly ReconciliationEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  // Lançamento manual (US5): insere conciliação `ManualEntry` + `fin_manual_entries` e marca a transação
  // `Pending→Reconciled` — mesma tx. SEM título (items vazio). `reconciliation.manualEntry` deve estar setado.
  confirmManualEntry: (
    reconciliation: Reconciliation,
    transactionId: StatementTransactionId,
    events?: readonly ReconciliationEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  // #269/US2: casa a perna de B com a contrapartida esperada — INSERT reconciliação `ManualEntry`/Transfer
  // (perna B) + `Pending→Reconciled` na transação de B + `Pending→Matched` na contrapartida — na MESMA tx
  // (atômico; ManualEntry-espelho da perna A). `events` mistura `ManualEntryRecorded` + `TransferCounterpartMatched`.
  confirmCounterpartMatch: (
    reconciliation: Reconciliation,
    counterpart: ExpectedCounterpart,
    transactionId: StatementTransactionId,
    events?: readonly FinancialAppendableEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  findById: (
    id: ReconciliationId,
  ) => Promise<Result<Reconciliation | null, ReconciliationRepositoryError>>;
  // Lookup reverso (#175): a conciliação ATIVA de uma transação (null se não houver). Destrava o
  // "Desfazer" pós-reload e o modal de detalhes — `fin_reconciliations` tem índice em transaction_id.
  findActiveByTransaction: (
    transactionId: StatementTransactionId,
  ) => Promise<Result<Reconciliation | null, ReconciliationRepositoryError>>;
  // `Active→Undone` (preserva registro), `Reconciled→Paid` nos títulos e `Reconciled→Pending` na transação.
  undo: (
    reconciliation: Reconciliation,
    events?: readonly ReconciliationEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
}>;
