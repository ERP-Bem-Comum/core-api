import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationPeriodId from '../../domain/reconciliation/reconciliation-period-id.ts';
import type { ReconciliationPeriodId as ReconciliationPeriodIdT } from '../../domain/reconciliation/reconciliation-period-id.ts';
import { closePeriod, type PeriodError } from '../../domain/reconciliation/period.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type CloseReconciliationPeriodDeps = Readonly<{
  periodStore: Pick<ReconciliationPeriodStore, 'close'>;
  statements: Pick<BankStatementRepository, 'listTransactionsByPeriod'>;
  clock: Pick<Clock, 'now'>;
  outbox: FinancialOutbox;
}>;

export type CloseReconciliationPeriodInput = Readonly<{
  debitAccountRef: string;
  periodStart: Date;
  periodEnd: Date;
  closedBy: string;
}>;

export type CloseReconciliationPeriodOutput = Readonly<{
  periodId: ReconciliationPeriodIdT;
  status: 'Closed';
}>;

export type CloseReconciliationPeriodError =
  | PeriodError
  | ReconciliationPeriodStoreError
  | BankStatementRepositoryError
  | OutboxAppendError;

// Fecha o período (US6): conta transações `Pending` no range (FR-013) → domínio `closePeriod` → persiste
// → publica `ReconciliationPeriodClosed`. O guard `period-closed` (R18) é aplicado pelos use-cases mutantes.
export const closeReconciliationPeriod =
  (deps: CloseReconciliationPeriodDeps) =>
  async (
    input: CloseReconciliationPeriodInput,
  ): Promise<Result<CloseReconciliationPeriodOutput, CloseReconciliationPeriodError>> => {
    const txsR = await deps.statements.listTransactionsByPeriod(
      input.debitAccountRef,
      input.periodStart,
      input.periodEnd,
    );
    if (!txsR.ok) return err(txsR.error);
    const hasPendingTransactions = txsR.value.some((t) => t.reconciliationStatus === 'Pending');

    const closed = closePeriod({
      periodId: ReconciliationPeriodId.generate(),
      debitAccountRef: input.debitAccountRef,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      hasPendingTransactions,
      closedBy: input.closedBy,
      occurredAt: deps.clock.now(),
    });
    if (!closed.ok) return err(closed.error);

    const saved = await deps.periodStore.close(closed.value.period);
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(closed.value.events);
    if (!published.ok) return err(published.error);

    return ok({ periodId: closed.value.period.id, status: 'Closed' });
  };
