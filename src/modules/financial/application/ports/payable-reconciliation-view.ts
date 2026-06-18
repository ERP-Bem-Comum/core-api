import type { Result } from '../../../../shared/primitives/result.ts';
import type { PayableSnapshot } from '../../domain/reconciliation/types.ts';

// Read port dos títulos para a conciliação: snapshots (validação do domínio `confirm`) e a lista de
// títulos `Paid` (GET /payables?status=Paid). Read-only — as mutações de status são do ReconciliationRepository.
export type PayableReconciliationViewError = 'payable-view-failure';

export type PaidPayableView = Readonly<{
  id: string;
  documentId: string;
  valueCents: number;
  dueDate: Date;
  paymentMethod: string;
}>;

export type PayableReconciliationView = Readonly<{
  findSnapshotsByIds: (
    ids: readonly string[],
  ) => Promise<Result<readonly PayableSnapshot[], PayableReconciliationViewError>>;
  searchPaid: () => Promise<Result<readonly PaidPayableView[], PayableReconciliationViewError>>;
}>;
