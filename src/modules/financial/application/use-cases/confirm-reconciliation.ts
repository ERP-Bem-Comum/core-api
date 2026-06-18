import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationId from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationId as ReconciliationIdT } from '../../domain/reconciliation/reconciliation-id.ts';
import { confirm } from '../../domain/reconciliation/reconciliation.ts';
import type { ReconciliationError } from '../../domain/reconciliation/errors.ts';
import type { Difference, ReconciliationType } from '../../domain/reconciliation/types.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { isClosed } from '../../domain/cedente/cedente-account.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  PayableReconciliationView,
  PayableReconciliationViewError,
} from '../ports/payable-reconciliation-view.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type ConfirmReconciliationDeps = Readonly<{
  reconciliationRepo: Pick<ReconciliationRepository, 'confirm'>;
  payables: Pick<PayableReconciliationView, 'findSnapshotsByIds'>;
  statements: Pick<BankStatementRepository, 'findTransaction'>;
  cedenteStore: Pick<CedenteAccountStore, 'findById'>;
  periods: Pick<ReconciliationPeriodStore, 'isClosed'>;
  clock: Pick<Clock, 'now'>;
  outbox: FinancialOutbox;
}>;

export type ConfirmReconciliationInput = Readonly<{
  transactionId: string;
  payableIds: readonly string[];
  difference?: Difference;
  reconciledBy: string;
}>;

export type ConfirmReconciliationOutput = Readonly<{
  reconciliationId: ReconciliationIdT;
  type: ReconciliationType;
  itemCount: number;
}>;

export type ConfirmReconciliationError =
  | ReconciliationError
  | 'statement-transaction-not-found'
  | 'transaction-already-reconciled'
  | 'cedente-account-not-found'
  | 'account-closed'
  | 'period-closed'
  | 'payable-not-found'
  | ReconciliationRepositoryError
  | PayableReconciliationViewError
  | BankStatementRepositoryError
  | CedenteAccountStoreError
  | ReconciliationPeriodStoreError
  | OutboxAppendError;

// Imperative Shell (validar → fetch → domain → persist → publish). Concilia sob comando explícito (R1):
// guard FR-015 (conta encerrada) → domínio confirm (R2/R3) → unit-of-work atômico no repo → evento.
export const confirmReconciliation =
  (deps: ConfirmReconciliationDeps) =>
  async (
    input: ConfirmReconciliationInput,
  ): Promise<Result<ConfirmReconciliationOutput, ConfirmReconciliationError>> => {
    const txR = await deps.statements.findTransaction(input.transactionId);
    if (!txR.ok) return err(txR.error);
    if (txR.value === null) return err('statement-transaction-not-found');
    const { transaction, debitAccountRef } = txR.value;
    if (transaction.reconciliationStatus !== 'Pending')
      return err('transaction-already-reconciled');

    // Guard FR-015: conta-cedente encerrada não concilia.
    const accId = CedenteAccountId.rehydrate(debitAccountRef);
    if (!accId.ok) return err('cedente-account-not-found');
    const accR = await deps.cedenteStore.findById(accId.value);
    if (!accR.ok) return err(accR.error);
    if (accR.value === null) return err('cedente-account-not-found');
    if (isClosed(accR.value)) return err('account-closed');

    // Guard R18: a data da transação não pode cair em período fechado.
    const periodClosedR = await deps.periods.isClosed(debitAccountRef, transaction.date);
    if (!periodClosedR.ok) return err(periodClosedR.error);
    if (periodClosedR.value) return err('period-closed');

    const snapsR = await deps.payables.findSnapshotsByIds(input.payableIds);
    if (!snapsR.ok) return err(snapsR.error);
    if (snapsR.value.length !== input.payableIds.length) return err('payable-not-found');

    const confirmed = confirm({
      reconciliationId: ReconciliationId.generate(),
      transactionId: transaction.id,
      transactionValueCents: transaction.valueCents,
      payables: snapsR.value,
      ...(input.difference !== undefined ? { difference: input.difference } : {}),
      reconciledBy: input.reconciledBy,
      occurredAt: deps.clock.now(),
    });
    if (!confirmed.ok) return err(confirmed.error);

    const saved = await deps.reconciliationRepo.confirm(
      confirmed.value.reconciliation,
      transaction.id,
    );
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(confirmed.value.events);
    if (!published.ok) return err(published.error);

    return ok({
      reconciliationId: confirmed.value.reconciliation.id,
      type: confirmed.value.reconciliation.type,
      itemCount: confirmed.value.reconciliation.items.length,
    });
  };
