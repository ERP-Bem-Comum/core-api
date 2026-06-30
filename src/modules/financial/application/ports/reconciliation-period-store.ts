import type { Result } from '../../../../shared/primitives/result.ts';
import type {
  ReconciliationPeriod,
  ReconciliationPeriodClosed,
  ReconciliationPeriodReopened,
} from '../../domain/reconciliation/period.ts';
import type { ReconciliationPeriodId } from '../../domain/reconciliation/reconciliation-period-id.ts';

// Persistência do período (US6) + guard `period-closed` (R18): `isClosed` responde se há um período
// `Closed` cobrindo a data para a conta-débito — consultado por import/conciliar/manual/desfazer.
export type ReconciliationPeriodStoreError = 'reconciliation-period-store-failure';

export type ReconciliationPeriodStore = Readonly<{
  // `events` (#127): `ReconciliationPeriodClosed` gravado no `fin_outbox` NA MESMA tx (ADR-0015).
  close: (
    period: ReconciliationPeriod,
    events?: readonly ReconciliationPeriodClosed[],
  ) => Promise<Result<void, ReconciliationPeriodStoreError>>;
  // Reabre (#203): UPDATE status='Open', closed_at=NULL, closed_by=NULL. `events` no `fin_outbox`
  // NA MESMA tx (ADR-0015). Espelha `close` — sem migration.
  reopen: (
    period: ReconciliationPeriod,
    events?: readonly ReconciliationPeriodReopened[],
  ) => Promise<Result<void, ReconciliationPeriodStoreError>>;
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
