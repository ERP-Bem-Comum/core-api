import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationId from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationId as ReconciliationIdT } from '../../domain/reconciliation/reconciliation-id.ts';
import type { ManualEntryId } from '../../domain/reconciliation/manual-entry-id.ts';
import {
  confirmManualEntry,
  type ManualEntryError,
} from '../../domain/reconciliation/manual-entry.ts';
import type { ManualEntryType } from '../../domain/reconciliation/types.ts';
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
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type RecordManualEntryDeps = Readonly<{
  reconciliationRepo: Pick<ReconciliationRepository, 'confirmManualEntry'>;
  statements: Pick<BankStatementRepository, 'findTransaction'>;
  cedenteStore: Pick<CedenteAccountStore, 'findById'>;
  periods: Pick<ReconciliationPeriodStore, 'isClosed'>;
  clock: Pick<Clock, 'now'>;
  outbox: FinancialOutbox;
}>;

export type RecordManualEntryInput = Readonly<{
  transactionId: string;
  type: ManualEntryType;
  supplierRef?: string;
  categoryRef?: string;
  costCenterRef?: string;
  programRef?: string;
  description?: string;
  reconciledBy: string;
}>;

export type RecordManualEntryOutput = Readonly<{
  reconciliationId: ReconciliationIdT;
  manualEntryId: ManualEntryId;
}>;

export type RecordManualEntryError =
  | ManualEntryError
  | 'statement-transaction-not-found'
  | 'transaction-already-reconciled'
  | 'cedente-account-not-found'
  | 'account-closed'
  | 'period-closed'
  | ReconciliationRepositoryError
  | BankStatementRepositoryError
  | CedenteAccountStoreError
  | ReconciliationPeriodStoreError
  | OutboxAppendError;

// Lança um ManualEntry para uma transação `Pending` sem título (ex.: tarifa). Guard FR-015 (conta não
// `Closed`) → domínio confirmManualEntry (valor = valor da transação) → unit-of-work → outbox. R1.
export const recordManualEntry =
  (deps: RecordManualEntryDeps) =>
  async (
    input: RecordManualEntryInput,
  ): Promise<Result<RecordManualEntryOutput, RecordManualEntryError>> => {
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

    // Guard R18: período fechado não aceita lançamento manual na data da transação.
    const periodClosedR = await deps.periods.isClosed(debitAccountRef, transaction.date);
    if (!periodClosedR.ok) return err(periodClosedR.error);
    if (periodClosedR.value) return err('period-closed');

    const confirmed = confirmManualEntry({
      reconciliationId: ReconciliationId.generate(),
      transactionId: transaction.id,
      type: input.type,
      valueCents: transaction.valueCents,
      ...(input.supplierRef !== undefined ? { supplierRef: input.supplierRef } : {}),
      ...(input.categoryRef !== undefined ? { categoryRef: input.categoryRef } : {}),
      ...(input.costCenterRef !== undefined ? { costCenterRef: input.costCenterRef } : {}),
      ...(input.programRef !== undefined ? { programRef: input.programRef } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      reconciledBy: input.reconciledBy,
      occurredAt: deps.clock.now(),
    });
    if (!confirmed.ok) return err(confirmed.error);

    const saved = await deps.reconciliationRepo.confirmManualEntry(
      confirmed.value.reconciliation,
      transaction.id,
    );
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(confirmed.value.events);
    if (!published.ok) return err(published.error);

    return ok({
      reconciliationId: confirmed.value.reconciliation.id,
      manualEntryId: confirmed.value.manualEntry.id,
    });
  };
