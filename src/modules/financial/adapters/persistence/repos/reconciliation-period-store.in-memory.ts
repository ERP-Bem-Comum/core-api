import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  ReconciliationPeriod,
  ReconciliationPeriodClosed,
  ReconciliationPeriodReopened,
} from '#src/modules/financial/domain/reconciliation/period.ts';
import type { ReconciliationPeriodId } from '#src/modules/financial/domain/reconciliation/reconciliation-period-id.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '#src/modules/financial/application/ports/reconciliation-period-store.ts';
import type { FinancialOutbox } from '#src/modules/financial/application/ports/outbox.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';

export type ReconciliationPeriodStoreMap = Map<string, ReconciliationPeriod>;

export const createInMemoryReconciliationPeriodStore = (
  periods: ReconciliationPeriodStoreMap = new Map<string, ReconciliationPeriod>(),
  // #127: outbox onde os eventos são "publicados" — paridade in-memory da atomicidade do Drizzle.
  outbox: FinancialOutbox = createInMemoryOutbox().port,
): ReconciliationPeriodStore => ({
  close: async (
    period: ReconciliationPeriod,
    events?: readonly ReconciliationPeriodClosed[],
  ): Promise<Result<void, ReconciliationPeriodStoreError>> => {
    // #127 — atomicidade: publica ANTES de persistir; falha no outbox → não persiste.
    if (events !== undefined && events.length > 0) {
      const appended = await outbox.append(events);
      if (!appended.ok) return err('reconciliation-period-store-failure');
    }
    periods.set(String(period.id), period);
    return ok(undefined);
  },

  reopen: async (
    period: ReconciliationPeriod,
    events?: readonly ReconciliationPeriodReopened[],
  ): Promise<Result<void, ReconciliationPeriodStoreError>> => {
    // #127 — atomicidade: publica ANTES de persistir; falha no outbox → não persiste.
    if (events !== undefined && events.length > 0) {
      const appended = await outbox.append(events);
      if (!appended.ok) return err('reconciliation-period-store-failure');
    }
    periods.set(String(period.id), period);
    return ok(undefined);
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

  listByAccount: async (
    debitAccountRef: string,
  ): Promise<Result<readonly ReconciliationPeriod[], ReconciliationPeriodStoreError>> =>
    Promise.resolve(ok([...periods.values()].filter((p) => p.debitAccountRef === debitAccountRef))),
});
