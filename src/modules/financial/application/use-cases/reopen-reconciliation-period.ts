import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationPeriodId from '../../domain/reconciliation/reconciliation-period-id.ts';
import type { ReconciliationPeriodId as ReconciliationPeriodIdT } from '../../domain/reconciliation/reconciliation-period-id.ts';
import { reopenPeriod, type PeriodError } from '../../domain/reconciliation/period.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';

export type ReopenReconciliationPeriodDeps = Readonly<{
  periodStore: Pick<ReconciliationPeriodStore, 'findById' | 'reopen'>;
  clock: Pick<Clock, 'now'>;
}>;

export type ReopenReconciliationPeriodInput = Readonly<{
  periodId: string;
  reopenedBy: string;
}>;

export type ReopenReconciliationPeriodOutput = Readonly<{
  periodId: ReconciliationPeriodIdT;
  status: 'Open';
}>;

export type ReopenReconciliationPeriodError =
  | PeriodError
  | ReconciliationPeriodStoreError
  | ReconciliationPeriodId.ReconciliationPeriodIdError
  | 'reconciliation-period-not-found';

// Reabre o período (#203): valida id → busca → domínio `reopenPeriod` (Closed→Open) → persiste +
// publica `ReconciliationPeriodReopened`. Espelha `closeReconciliationPeriod`. Não toca transações.
export const reopenReconciliationPeriod =
  (deps: ReopenReconciliationPeriodDeps) =>
  async (
    input: ReopenReconciliationPeriodInput,
  ): Promise<Result<ReopenReconciliationPeriodOutput, ReopenReconciliationPeriodError>> => {
    const id = ReconciliationPeriodId.rehydrate(input.periodId);
    if (!id.ok) return err(id.error);

    const found = await deps.periodStore.findById(id.value);
    if (!found.ok) return err(found.error);
    if (found.value === null) return err('reconciliation-period-not-found');

    const reopened = reopenPeriod(found.value, {
      reopenedBy: input.reopenedBy,
      occurredAt: deps.clock.now(),
    });
    if (!reopened.ok) return err(reopened.error);

    const saved = await deps.periodStore.reopen(reopened.value.period, reopened.value.events);
    if (!saved.ok) return err(saved.error);

    return ok({ periodId: reopened.value.period.id, status: 'Open' });
  };
