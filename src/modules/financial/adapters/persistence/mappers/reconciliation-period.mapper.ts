// Mapper row↔domínio do período de conciliação (#125). `toDomain` revalida id + status (Open|Closed).

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as ReconciliationPeriodId from '#src/modules/financial/domain/reconciliation/reconciliation-period-id.ts';
import type {
  ReconciliationPeriod,
  ReconciliationPeriodStatus,
} from '#src/modules/financial/domain/reconciliation/period.ts';
import type {
  NewReconciliationPeriodRow,
  ReconciliationPeriodRow,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

export type ReconciliationPeriodMapperError =
  | 'invalid-reconciliation-period-id'
  | 'invalid-reconciliation-period-status';

const toStatus = (raw: string): ReconciliationPeriodStatus | null =>
  raw === 'Open' || raw === 'Closed' ? raw : null;

export const toRow = (period: ReconciliationPeriod): NewReconciliationPeriodRow => ({
  id: period.id,
  debitAccountRef: period.debitAccountRef,
  periodStart: period.periodStart,
  periodEnd: period.periodEnd,
  status: period.status,
  closedAt: period.closedAt,
  closedBy: period.closedBy,
});

export const toDomain = (
  row: Readonly<ReconciliationPeriodRow>,
): Result<ReconciliationPeriod, ReconciliationPeriodMapperError> => {
  const id = ReconciliationPeriodId.rehydrate(row.id);
  if (!id.ok) return err('invalid-reconciliation-period-id');

  const status = toStatus(row.status);
  if (status === null) return err('invalid-reconciliation-period-status');

  return ok(
    immutable<ReconciliationPeriod>({
      id: id.value,
      debitAccountRef: row.debitAccountRef,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      status,
      closedAt: row.closedAt,
      closedBy: row.closedBy,
    }),
  );
};
