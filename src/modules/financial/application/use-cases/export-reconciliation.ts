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

// #649: exporta por PERÍODO (`:id`, resolve a tripla via findById) OU por RANGE direto
// (conta + intervalo), sem depender de período fechado. O período sempre foi só carona da tripla
// `(debitAccountRef, periodStart, periodEnd)` — nenhum caminho checa `status`.
export type ExportReconciliationInput =
  | Readonly<{ by: 'period'; periodId: string; format: ReconciliationExportFormat }>
  | Readonly<{
      by: 'range';
      debitAccountRef: string;
      periodStart: Date;
      periodEnd: Date;
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

type ExportTriple = Readonly<{ debitAccountRef: string; periodStart: Date; periodEnd: Date }>;

// Resolve a tripla `(debitAccountRef, periodStart, periodEnd)`: do range direto, ou do período
// (`:id`) via findById. O período sempre foi só carona da tripla — nenhum caminho checa `status`.
const resolveTriple = async (
  input: ExportReconciliationInput,
  periodStore: Pick<ReconciliationPeriodStore, 'findById'>,
): Promise<
  Result<
    ExportTriple,
    | 'reconciliation-period-id-invalid'
    | 'reconciliation-period-not-found'
    | ReconciliationPeriodStoreError
  >
> => {
  if (input.by === 'range') {
    return ok({
      debitAccountRef: input.debitAccountRef,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });
  }
  const idR = ReconciliationPeriodId.rehydrate(input.periodId);
  if (!idR.ok) return err('reconciliation-period-id-invalid');
  const periodR = await periodStore.findById(idR.value);
  if (!periodR.ok) return err(periodR.error);
  if (periodR.value === null) return err('reconciliation-period-not-found');
  const { debitAccountRef, periodStart, periodEnd } = periodR.value;
  return ok({ debitAccountRef, periodStart, periodEnd });
};

// Exporta a conciliação de um período (US6) em OFX/CSV. Read-only: carrega o período → lista as
// transações do range → delega a formatação ao exporter (Node puro).
export const exportReconciliation =
  (deps: ExportReconciliationDeps) =>
  async (
    input: ExportReconciliationInput,
  ): Promise<Result<ExportReconciliationOutput, ExportReconciliationError>> => {
    const tripleR = await resolveTriple(input, deps.periodStore);
    if (!tripleR.ok) return err(tripleR.error);
    const { debitAccountRef, periodStart, periodEnd } = tripleR.value;

    const txsR = await deps.statements.listTransactionsByPeriod(
      debitAccountRef,
      periodStart,
      periodEnd,
    );
    if (!txsR.ok) return err(txsR.error);

    const exported = deps.exporter.export(input.format, {
      debitAccountRef,
      periodStart,
      periodEnd,
      transactions: txsR.value,
    });
    if (!exported.ok) return err(exported.error);

    return ok({ format: input.format, content: exported.value });
  };
