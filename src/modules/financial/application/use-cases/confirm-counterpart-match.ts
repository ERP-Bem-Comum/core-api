import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationId from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationId as ReconciliationIdT } from '../../domain/reconciliation/reconciliation-id.ts';
import {
  confirmManualEntry,
  type ManualEntryError,
} from '../../domain/reconciliation/manual-entry.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { isClosed } from '../../domain/cedente/cedente-account.ts';
import * as ExpectedCounterpartId from '../../domain/expected-counterpart/expected-counterpart-id.ts';
import { match } from '../../domain/expected-counterpart/expected-counterpart.ts';
import type { ExpectedCounterpartError } from '../../domain/expected-counterpart/types.ts';
import type { FinancialAppendableEvent } from '../ports/outbox.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import type {
  ExpectedCounterpartStore,
  ExpectedCounterpartStoreError,
} from '../ports/expected-counterpart-store.ts';

export type ConfirmCounterpartMatchDeps = Readonly<{
  statements: Pick<BankStatementRepository, 'findTransaction'>;
  cedenteStore: Pick<CedenteAccountStore, 'findById'>;
  periods: Pick<ReconciliationPeriodStore, 'isClosed'>;
  expectedCounterpartStore: Pick<ExpectedCounterpartStore, 'findById'>;
  reconciliationRepo: Pick<ReconciliationRepository, 'confirmCounterpartMatch'>;
  clock: Pick<Clock, 'now'>;
}>;

export type ConfirmCounterpartMatchInput = Readonly<{
  transactionId: string;
  counterpartId: string;
  reconciledBy: string;
}>;

export type ConfirmCounterpartMatchOutput = Readonly<{
  reconciliationId: ReconciliationIdT;
  counterpartId: string;
}>;

export type ConfirmCounterpartMatchError =
  | 'statement-transaction-not-found'
  | 'transaction-already-reconciled'
  | 'cedente-account-not-found'
  | 'account-closed'
  | 'period-closed'
  | 'counterpart-not-found'
  | 'counterpart-account-mismatch'
  | 'counterpart-value-mismatch'
  | ExpectedCounterpartError
  | ManualEntryError
  | ReconciliationRepositoryError
  | BankStatementRepositoryError
  | CedenteAccountStoreError
  | ReconciliationPeriodStoreError
  | ExpectedCounterpartStoreError;

// US2 (#269): confirma o casamento transação real de B × contrapartida esperada. Consome a contrapartida
// (Pending → Matched) e concilia a perna de B como um ManualEntry Transfer (espelho da perna A) — vínculo
// A↔B, 0 duplicata, tudo na MESMA unit-of-work atômica (reconciliationRepo.confirmCounterpartMatch).
export const confirmCounterpartMatch =
  (deps: ConfirmCounterpartMatchDeps) =>
  async (
    input: ConfirmCounterpartMatchInput,
  ): Promise<Result<ConfirmCounterpartMatchOutput, ConfirmCounterpartMatchError>> => {
    const txR = await deps.statements.findTransaction(input.transactionId);
    if (!txR.ok) return err(txR.error);
    if (txR.value === null) return err('statement-transaction-not-found');
    const { transaction, debitAccountRef } = txR.value;
    if (transaction.reconciliationStatus !== 'Pending')
      return err('transaction-already-reconciled');

    const accId = CedenteAccountId.rehydrate(debitAccountRef);
    if (!accId.ok) return err('cedente-account-not-found');
    const accR = await deps.cedenteStore.findById(accId.value);
    if (!accR.ok) return err(accR.error);
    if (accR.value === null) return err('cedente-account-not-found');
    if (isClosed(accR.value)) return err('account-closed');

    const periodClosedR = await deps.periods.isClosed(debitAccountRef, transaction.date);
    if (!periodClosedR.ok) return err(periodClosedR.error);
    if (periodClosedR.value) return err('period-closed');

    const cpId = ExpectedCounterpartId.rehydrate(input.counterpartId);
    if (!cpId.ok) return err('counterpart-not-found');
    const cpR = await deps.expectedCounterpartStore.findById(cpId.value);
    if (!cpR.ok) return err(cpR.error);
    if (cpR.value === null) return err('counterpart-not-found');
    const counterpart = cpR.value;

    // A transação real deve estar na conta de DESTINO da contrapartida (a outra perna chegou em B).
    if (String(counterpart.destinationAccountRef) !== debitAccountRef)
      return err('counterpart-account-mismatch');
    if (Number(counterpart.valueCents) !== transaction.valueCents)
      return err('counterpart-value-mismatch');

    // Domínio: consome a contrapartida (Pending → Matched, grava a transação real que a casou).
    const matched = match(counterpart, String(transaction.id));
    if (!matched.ok) return err(matched.error);

    // Perna B: ManualEntry Transfer (espelho da perna A) — o destino aponta de volta para a conta A.
    const legB = confirmManualEntry({
      reconciliationId: ReconciliationId.generate(),
      transactionId: transaction.id,
      type: 'Transfer',
      valueCents: transaction.valueCents,
      destinationAccountRef: String(counterpart.originAccountRef),
      reconciledBy: input.reconciledBy,
      occurredAt: deps.clock.now(),
    });
    if (!legB.ok) return err(legB.error);

    const events: readonly FinancialAppendableEvent[] = [
      ...legB.value.events,
      ...matched.value.events,
    ];
    const saved = await deps.reconciliationRepo.confirmCounterpartMatch(
      legB.value.reconciliation,
      matched.value.counterpart,
      transaction.id,
      events,
    );
    if (!saved.ok) return err(saved.error);

    return ok({
      reconciliationId: legB.value.reconciliation.id,
      counterpartId: input.counterpartId,
    });
  };
