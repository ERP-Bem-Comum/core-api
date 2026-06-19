import type { Result } from '../../../../shared/primitives/result.ts';
import type { ReconciliationPeriod } from '../../domain/reconciliation/period.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';

export type ListReconciliationPeriodsInput = Readonly<{ debitAccountRef: string }>;

type Deps = Readonly<{ periodStore: Pick<ReconciliationPeriodStore, 'listByAccount'> }>;

// #173: lista os períodos de uma conta (obter periodId p/ exportar OFX/CSV fora do fechamento).
export const listReconciliationPeriods =
  (deps: Deps) =>
  async (
    input: ListReconciliationPeriodsInput,
  ): Promise<Result<readonly ReconciliationPeriod[], ReconciliationPeriodStoreError>> =>
    deps.periodStore.listByAccount(input.debitAccountRef);
