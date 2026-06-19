import type { Result } from '../../../../shared/primitives/result.ts';
import type { ReconciliationPeriod } from '../../domain/reconciliation/period.ts';
import type { ReconciliationPeriodId } from '../../domain/reconciliation/reconciliation-period-id.ts';

// Persistência do período (US6) + guard `period-closed` (R18): `isClosed` responde se há um período
// `Closed` cobrindo a data para a conta-débito — consultado por import/conciliar/manual/desfazer.
export type ReconciliationPeriodStoreError = 'reconciliation-period-store-failure';

export type ReconciliationPeriodStore = Readonly<{
  close: (period: ReconciliationPeriod) => Promise<Result<void, ReconciliationPeriodStoreError>>;
  findById: (
    id: ReconciliationPeriodId,
  ) => Promise<Result<ReconciliationPeriod | null, ReconciliationPeriodStoreError>>;
  isClosed: (
    debitAccountRef: string,
    date: Date,
  ) => Promise<Result<boolean, ReconciliationPeriodStoreError>>;
  // Lista os períodos de uma conta-débito (#173) — obter periodId p/ exportar fora do fechamento.
  listByAccount: (
    debitAccountRef: string,
  ) => Promise<Result<readonly ReconciliationPeriod[], ReconciliationPeriodStoreError>>;
}>;
