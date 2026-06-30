import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

import * as ReconciliationPeriodId from '../../domain/reconciliation/reconciliation-period-id.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import type {
  ReconciliationExporter,
  ReconciliationExportError,
  ReconciliationExportFormat,
} from '../ports/reconciliation-exporter.ts';

export type ExportReconciliationDeps = Readonly<{
  periodStore: Pick<ReconciliationPeriodStore, 'findById'>;
  statements: Pick<BankStatementRepository, 'listTransactionsByPeriod'>;
  exporter: ReconciliationExporter;
}>;

export type ExportReconciliationInput = Readonly<{
  periodId: string;
  format: ReconciliationExportFormat;
}>;

export type ExportReconciliationOutput = Readonly<{
  format: ReconciliationExportFormat;
  content: string;
}>;

export type ExportReconciliationError =
  | 'reconciliation-period-id-invalid'
  | 'reconciliation-period-not-found'
  | ReconciliationExportError
  | ReconciliationPeriodStoreError
  | BankStatementRepositoryError;

// Exporta a conciliação de um período (US6) em OFX/CSV. Read-only: carrega o período → lista as
// transações do range → delega a formatação ao exporter (Node puro).
export const exportReconciliation =
  (deps: ExportReconciliationDeps) =>
  async (
    input: ExportReconciliationInput,
  ): Promise<Result<ExportReconciliationOutput, ExportReconciliationError>> => {
    const idR = ReconciliationPeriodId.rehydrate(input.periodId);
    if (!idR.ok) return err('reconciliation-period-id-invalid');

    const periodR = await deps.periodStore.findById(idR.value);
    if (!periodR.ok) return err(periodR.error);
    if (periodR.value === null) return err('reconciliation-period-not-found');
    const period = periodR.value;

    const txsR = await deps.statements.listTransactionsByPeriod(
      period.debitAccountRef,
      period.periodStart,
      period.periodEnd,
    );
    if (!txsR.ok) return err(txsR.error);

    const exported = deps.exporter.export(input.format, {
      debitAccountRef: period.debitAccountRef,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      transactions: txsR.value,
    });
    if (!exported.ok) return err(exported.error);

    return ok({ format: input.format, content: exported.value });
  };
