import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationId from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationId as ReconciliationIdT } from '../../domain/reconciliation/reconciliation-id.ts';
import * as StatementTransactionId from '../../domain/statement/statement-transaction-id.ts';
import { undo } from '../../domain/reconciliation/reconciliation.ts';
import type { ReconciliationError } from '../../domain/reconciliation/errors.ts';
import { discard, reopen } from '../../domain/expected-counterpart/expected-counterpart.ts';
import type { ExpectedCounterpartError } from '../../domain/expected-counterpart/types.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import type {
  ExpectedCounterpartStore,
  ExpectedCounterpartStoreError,
} from '../ports/expected-counterpart-store.ts';

export type UndoReconciliationDeps = Readonly<{
  reconciliationRepo: Pick<
    ReconciliationRepository,
    | 'findById'
    | 'undo'
    | 'findActiveByTransaction'
    | 'undoCounterpartOrigin'
    | 'undoCounterpartDestination'
  >;
  // Guard R18: localiza a transação (data+conta) para checar período fechado.
  statements: Pick<BankStatementRepository, 'findTransaction'>;
  periods: Pick<ReconciliationPeriodStore, 'isClosed'>;
  clock: Pick<Clock, 'now'>;
  // #269/US3 + #450: se esta conciliação é a origem (A) de uma contrapartida, ou a perna de destino (B)
  // que a casou, tratá-la no mesmo undo — busca por origem (A) e, quando não for origem, por destino (B).
  expectedCounterpartStore: Pick<
    ExpectedCounterpartStore,
    'findByOriginReconciliation' | 'findByMatchedTransaction'
  >;
}>;

export type UndoReconciliationInput = Readonly<{
  reconciliationId: string;
  undoneBy: string;
  reason?: string;
}>;

export type UndoReconciliationOutput = Readonly<{
  reconciliationId: ReconciliationIdT;
  status: 'Undone';
}>;

export type UndoReconciliationError =
  | ReconciliationError
  | 'reconciliation-id-invalid'
  | 'reconciliation-not-found'
  | 'statement-transaction-id-invalid'
  | 'period-closed'
  | ExpectedCounterpartError
  | ReconciliationRepositoryError
  | BankStatementRepositoryError
  | ReconciliationPeriodStoreError
  | ExpectedCounterpartStoreError;

// Desfaz a conciliação (R7): carrega → domínio `undo` (Active→Undone) → unit-of-work atômico (reverte
// status de título/transação) → publica `ReconciliationUndone`. Preserva o registro (nunca deleta).
export const undoReconciliation =
  (deps: UndoReconciliationDeps) =>
  async (
    input: UndoReconciliationInput,
  ): Promise<Result<UndoReconciliationOutput, UndoReconciliationError>> => {
    const idR = ReconciliationId.rehydrate(input.reconciliationId);
    if (!idR.ok) return err('reconciliation-id-invalid');

    const found = await deps.reconciliationRepo.findById(idR.value);
    if (!found.ok) return err(found.error);
    if (found.value === null) return err('reconciliation-not-found');

    // Guard R18: não desfazer conciliação cuja transação caia em período fechado.
    const txR = await deps.statements.findTransaction(String(found.value.transactionId));
    if (!txR.ok) return err(txR.error);
    if (txR.value !== null) {
      const periodClosedR = await deps.periods.isClosed(
        txR.value.debitAccountRef,
        txR.value.transaction.date,
      );
      if (!periodClosedR.ok) return err(periodClosedR.error);
      if (periodClosedR.value) return err('period-closed');
    }

    const undone = undo(found.value, {
      undoneBy: input.undoneBy,
      occurredAt: deps.clock.now(),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    });
    if (!undone.ok) return err(undone.error);

    // #269/US3: se esta conciliação é a ORIGEM (A) de uma contrapartida, tratá-la no mesmo undo.
    const cpR = await deps.expectedCounterpartStore.findByOriginReconciliation(found.value.id);
    if (!cpR.ok) return err(cpR.error);
    const counterpart = cpR.value;

    if (counterpart !== null && counterpart.status === 'Pending') {
      // Nunca casada → descarta (nada órfão em B).
      const discarded = discard(counterpart);
      if (!discarded.ok) return err(discarded.error);
      const saved = await deps.reconciliationRepo.undoCounterpartOrigin(
        undone.value.reconciliation,
        discarded.value.counterpart,
        null,
        [...undone.value.events, ...discarded.value.events],
      );
      if (!saved.ok) return err(saved.error);
    } else if (counterpart !== null && counterpart.status === 'Matched') {
      // Já casada → reabre a contrapartida e desfaz a perna B (a transação real volta a Pending).
      const reopened = reopen(counterpart);
      if (!reopened.ok) return err(reopened.error);
      if (counterpart.matchedTransactionRef === null) return err('reconciliation-not-found');
      const legBTxId = StatementTransactionId.rehydrate(counterpart.matchedTransactionRef);
      if (!legBTxId.ok) return err('statement-transaction-id-invalid');
      const legBR = await deps.reconciliationRepo.findActiveByTransaction(legBTxId.value);
      if (!legBR.ok) return err(legBR.error);
      if (legBR.value === null) return err('reconciliation-not-found');
      const undoneB = undo(legBR.value, {
        undoneBy: input.undoneBy,
        occurredAt: deps.clock.now(),
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
      });
      if (!undoneB.ok) return err(undoneB.error);
      const saved = await deps.reconciliationRepo.undoCounterpartOrigin(
        undone.value.reconciliation,
        reopened.value.counterpart,
        undoneB.value.reconciliation,
        [...undone.value.events, ...undoneB.value.events],
      );
      if (!saved.ok) return err(saved.error);
    } else {
      // #450: não é ORIGEM (ou origem já Discarded). Esta conciliação pode ser a PERNA B (destino) que
      // casou uma contrapartida — localiza pela transação casada (`matched_transaction_ref` = a transação
      // desta perna B). (Origem e destino são mutuamente exclusivos: origem A ≠ transação de B.)
      const cpDestR = await deps.expectedCounterpartStore.findByMatchedTransaction(
        found.value.transactionId,
      );
      if (!cpDestR.ok) return err(cpDestR.error);
      const cpDest = cpDestR.value;

      if (cpDest !== null && cpDest.status === 'Matched') {
        // Guard de simetria: só REABRE a expectativa (Matched → Pending) na conta de destino. NÃO
        // cascateia outra conciliação (a própria B já é o `undone` principal) e NÃO toca a origem/perna A.
        const reopened = reopen(cpDest);
        if (!reopened.ok) return err(reopened.error);
        const saved = await deps.reconciliationRepo.undoCounterpartDestination(
          undone.value.reconciliation,
          reopened.value.counterpart,
          [...undone.value.events, ...reopened.value.events],
        );
        if (!saved.ok) return err(saved.error);
      } else {
        // Sem contrapartida por origem nem por destino (ou já Discarded) → undo normal (back-compat).
        const saved = await deps.reconciliationRepo.undo(
          undone.value.reconciliation,
          undone.value.events,
        );
        if (!saved.ok) return err(saved.error);
      }
    }

    return ok({ reconciliationId: found.value.id, status: 'Undone' });
  };
