import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { ReconciliationPeriod } from '#src/modules/financial/domain/reconciliation/period.ts';
import type { ReconciliationPeriodId } from '#src/modules/financial/domain/reconciliation/reconciliation-period-id.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '#src/modules/financial/application/ports/reconciliation-period-store.ts';

export type ReconciliationPeriodStoreMap = Map<string, ReconciliationPeriod>;

export const createInMemoryReconciliationPeriodStore = (
  periods: ReconciliationPeriodStoreMap = new Map<string, ReconciliationPeriod>(),
): ReconciliationPeriodStore => ({
  close: async (
    period: ReconciliationPeriod,
  ): Promise<Result<void, ReconciliationPeriodStoreError>> => {
    periods.set(String(period.id), period);
    return Promise.resolve(ok(undefined));
  },

  findById: async (
    id: ReconciliationPeriodId,
  ): Promise<Result<ReconciliationPeriod | null, ReconciliationPeriodStoreError>> =>
    Promise.resolve(ok(periods.get(String(id)) ?? null)),

  isClosed: async (
    debitAccountRef: string,
    date: Date,
  ): Promise<Result<boolean, ReconciliationPeriodStoreError>> => {
    const at = date.getTime();
    for (const period of periods.values()) {
      if (period.status !== 'Closed') continue;
      if (period.debitAccountRef !== debitAccountRef) continue;
      if (period.periodStart.getTime() <= at && at <= period.periodEnd.getTime()) {
        return Promise.resolve(ok(true));
      }
    }
    return Promise.resolve(ok(false));
  },
});
