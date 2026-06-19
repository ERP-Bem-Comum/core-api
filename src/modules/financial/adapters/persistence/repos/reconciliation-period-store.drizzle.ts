// Adapter Drizzle do ReconciliationPeriodStore (#125). `close` insere o período `Closed` (UNIQUE
// (debit_account_ref, period_start, period_end) impede re-fechar). `isClosed` é o guard R18.
// Boundary: try/catch → Result.

import { and, eq, gte, lte } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { ReconciliationPeriod } from '#src/modules/financial/domain/reconciliation/period.ts';
import type { ReconciliationPeriodId } from '#src/modules/financial/domain/reconciliation/reconciliation-period-id.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '#src/modules/financial/application/ports/reconciliation-period-store.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finReconciliationPeriods } from '../schemas/mysql.ts';
import { toRow, toDomain } from '../mappers/reconciliation-period.mapper.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-reconciliation-period-store] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzleReconciliationPeriodStore = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ReconciliationPeriodStore => {
  const { db } = handle;

  return {
    close: async (
      period: ReconciliationPeriod,
    ): Promise<Result<void, ReconciliationPeriodStoreError>> => {
      try {
        await db.insert(finReconciliationPeriods).values(toRow(period));
        return ok(undefined);
      } catch (cause) {
        logStore('close', cause);
        return err('reconciliation-period-store-failure');
      }
    },

    findById: async (
      id: ReconciliationPeriodId,
    ): Promise<Result<ReconciliationPeriod | null, ReconciliationPeriodStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finReconciliationPeriods)
          .where(eq(finReconciliationPeriods.id, String(id)))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);
        const mapped = toDomain(row);
        if (!mapped.ok) {
          logStore('findById:map', mapped.error);
          return err('reconciliation-period-store-failure');
        }
        return ok(mapped.value);
      } catch (cause) {
        logStore('findById', cause);
        return err('reconciliation-period-store-failure');
      }
    },

    listByAccount: async (
      debitAccountRef: string,
    ): Promise<Result<readonly ReconciliationPeriod[], ReconciliationPeriodStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finReconciliationPeriods)
          .where(eq(finReconciliationPeriods.debitAccountRef, debitAccountRef));
        const periods: ReconciliationPeriod[] = [];
        for (const row of rows) {
          const mapped = toDomain(row);
          if (!mapped.ok) {
            logStore('listByAccount:map', mapped.error);
            return err('reconciliation-period-store-failure');
          }
          periods.push(mapped.value);
        }
        return ok(periods);
      } catch (cause) {
        logStore('listByAccount', cause);
        return err('reconciliation-period-store-failure');
      }
    },

    isClosed: async (
      debitAccountRef: string,
      date: Date,
    ): Promise<Result<boolean, ReconciliationPeriodStoreError>> => {
      try {
        const rows = await db
          .select({ id: finReconciliationPeriods.id })
          .from(finReconciliationPeriods)
          .where(
            and(
              eq(finReconciliationPeriods.debitAccountRef, debitAccountRef),
              eq(finReconciliationPeriods.status, 'Closed'),
              lte(finReconciliationPeriods.periodStart, date),
              gte(finReconciliationPeriods.periodEnd, date),
            ),
          )
          .limit(1);
        return ok(rows.length > 0);
      } catch (cause) {
        logStore('isClosed', cause);
        return err('reconciliation-period-store-failure');
      }
    },
  };
};
