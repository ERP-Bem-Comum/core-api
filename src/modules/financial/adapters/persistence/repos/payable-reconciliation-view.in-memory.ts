import { type Result, ok } from '#src/shared/primitives/result.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import type { PayableSnapshot } from '#src/modules/financial/domain/reconciliation/types.ts';
import type {
  PaidPayableView,
  PayableReconciliationView,
  PayableReconciliationViewError,
} from '#src/modules/financial/application/ports/payable-reconciliation-view.ts';

// Registro do título no store in-memory de conciliação (dedicado — desacoplado do document repo;
// testes/composição de memória semeiam direto). O driver mysql usa fin_payables real.
export type PayableRecord = Readonly<{
  id: string;
  documentId: string;
  status: DocumentStatus;
  valueCents: number;
  dueDate: Date;
  paymentMethod: string;
}>;
export type PayableStore = Map<string, PayableRecord>;

export const createInMemoryPayableReconciliationView = (
  payables: PayableStore = new Map<string, PayableRecord>(),
): PayableReconciliationView => ({
  findSnapshotsByIds: async (
    ids: readonly string[],
  ): Promise<Result<readonly PayableSnapshot[], PayableReconciliationViewError>> => {
    const snapshots: PayableSnapshot[] = [];
    for (const id of ids) {
      const rec = payables.get(id);
      if (rec === undefined) continue;
      const idR = PayableId.rehydrate(rec.id);
      if (!idR.ok) continue;
      snapshots.push({ id: idR.value, status: rec.status, valueCents: rec.valueCents });
    }
    return Promise.resolve(ok(snapshots));
  },

  searchPaid: async (): Promise<
    Result<readonly PaidPayableView[], PayableReconciliationViewError>
  > => {
    const paid: PaidPayableView[] = [];
    for (const rec of payables.values()) {
      if (rec.status !== 'Paid') continue;
      paid.push({
        id: rec.id,
        documentId: rec.documentId,
        valueCents: rec.valueCents,
        dueDate: rec.dueDate,
        paymentMethod: rec.paymentMethod,
      });
    }
    return Promise.resolve(ok(paid));
  },
});
