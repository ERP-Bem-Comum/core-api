import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { ReconciliationPeriodId } from './reconciliation-period-id.ts';

// Fechamento de período (US6 — "selo" contábil). Domínio puro: a contagem de transações `Pending` é
// feita pela application (repo); aqui só a regra (FR-013: fecha só sem pendências) + range válido.

export type ReconciliationPeriodStatus = 'Open' | 'Closed';
export type PeriodError = 'invalid-period-range' | 'period-has-pending-transactions';

export type ReconciliationPeriod = Readonly<{
  id: ReconciliationPeriodId;
  debitAccountRef: string;
  periodStart: Date;
  periodEnd: Date;
  status: ReconciliationPeriodStatus;
  closedAt: Date | null;
  closedBy: string | null;
}>;

// Evento de domínio (EN-passado). Publicado uma vez por fechamento.
export type ReconciliationPeriodClosed = Readonly<{
  type: 'ReconciliationPeriodClosed';
  periodId: ReconciliationPeriodId;
  debitAccountRef: string;
  periodStart: Date;
  periodEnd: Date;
  occurredAt: Date;
}>;

export type ClosePeriodInput = Readonly<{
  periodId: ReconciliationPeriodId;
  debitAccountRef: string;
  periodStart: Date;
  periodEnd: Date;
  hasPendingTransactions: boolean;
  closedBy: string;
  occurredAt: Date;
}>;

export type ClosePeriodOutput = Readonly<{
  period: ReconciliationPeriod;
  events: readonly ReconciliationPeriodClosed[];
}>;

export const closePeriod = (input: ClosePeriodInput): Result<ClosePeriodOutput, PeriodError> => {
  if (input.periodStart.getTime() > input.periodEnd.getTime()) return err('invalid-period-range');
  if (input.hasPendingTransactions) return err('period-has-pending-transactions');

  const period: ReconciliationPeriod = immutable<ReconciliationPeriod>({
    id: input.periodId,
    debitAccountRef: input.debitAccountRef,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    status: 'Closed',
    closedAt: input.occurredAt,
    closedBy: input.closedBy,
  });

  const events: readonly ReconciliationPeriodClosed[] = [
    {
      type: 'ReconciliationPeriodClosed',
      periodId: input.periodId,
      debitAccountRef: input.debitAccountRef,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      occurredAt: input.occurredAt,
    },
  ];

  return ok(immutable<ClosePeriodOutput>({ period, events }));
};
