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
  // M2/#268 — opcionais para não obrigar todo seed existente a declarar o que não exercita. No
  // adapter real `kind` vem de `fin_payables` e os 5 refs do LEFT JOIN em `fin_documents`; aqui os
  // dois moram no mesmo registro plano porque não há JOIN a espelhar.
  //
  // `kind` default 'Parent': o título líquido é o caso comum e o único que existe em documento sem
  // retenção. Quem testa a cascata declara o 'Child' explicitamente.
  kind?: 'Parent' | 'Child';
  programRef?: string | null;
  budgetPlanRef?: string | null;
  costCenterRef?: string | null;
  categoryRef?: string | null;
  subcategoryRef?: string | null;
}>;
export type PayableStore = Map<string, PayableRecord>;

// Status do DOCUMENTO por documentId (paridade com o LEFT JOIN em fin_documents do adapter real).
// O `searchPaid` decide candidatura pela fonte do grid Contas a Pagar — o status do documento —
// não só pelo status do próprio título. Vazio por padrão (back-compat: cai no OR do título Paid).
export type DocumentStatusStore = Map<string, DocumentStatus>;

export const createInMemoryPayableReconciliationView = (
  payables: PayableStore = new Map<string, PayableRecord>(),
  documentStatuses: DocumentStatusStore = new Map<string, DocumentStatus>(),
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
      // Paridade com o #323: título é candidato se o DOCUMENTO está Pago (traz as retenções ainda
      // Open/Approved) OU o próprio título é Paid (líquido). Salvaguarda: exclui já conciliados.
      const docPaid = documentStatuses.get(rec.documentId) === 'Paid';
      const selfPaid = rec.status === 'Paid';
      if ((!docPaid && !selfPaid) || rec.status === 'Reconciled') continue;
      paid.push({
        id: rec.id,
        documentId: rec.documentId,
        valueCents: rec.valueCents,
        dueDate: rec.dueDate,
        paymentMethod: rec.paymentMethod,
        kind: rec.kind ?? 'Parent',
        programRef: rec.programRef ?? null,
        budgetPlanRef: rec.budgetPlanRef ?? null,
        costCenterRef: rec.costCenterRef ?? null,
        categoryRef: rec.categoryRef ?? null,
        subcategoryRef: rec.subcategoryRef ?? null,
      });
    }
    return Promise.resolve(ok(paid));
  },
});
