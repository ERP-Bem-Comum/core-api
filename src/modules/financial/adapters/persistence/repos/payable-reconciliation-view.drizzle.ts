// Adapter Drizzle do PayableReconciliationView (read-only sobre fin_payables). Boundary: try/catch → Result.

import { and, eq, inArray, ne, or } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import type { PayableSnapshot } from '#src/modules/financial/domain/reconciliation/types.ts';
import type {
  PaidPayableView,
  PayableReconciliationView,
  PayableReconciliationViewError,
} from '#src/modules/financial/application/ports/payable-reconciliation-view.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finDocuments, finPayables } from '../schemas/mysql.ts';

const DOC_STATUSES: ReadonlySet<string> = new Set([
  'Draft',
  'Open',
  'Approved',
  'Transmitted',
  'Refused',
  'Paid',
  'Reconciled',
]);
const toDocStatus = (raw: string): DocumentStatus | null =>
  DOC_STATUSES.has(raw) ? (raw as DocumentStatus) : null;

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-payable-view] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzlePayableReconciliationView = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PayableReconciliationView => {
  const { db } = handle;

  return {
    findSnapshotsByIds: async (
      ids: readonly string[],
    ): Promise<Result<readonly PayableSnapshot[], PayableReconciliationViewError>> => {
      if (ids.length === 0) return ok([]);
      try {
        const rows = await db
          .select({ id: finPayables.id, status: finPayables.status, value: finPayables.value })
          .from(finPayables)
          .where(inArray(finPayables.id, [...ids]));
        const snapshots: PayableSnapshot[] = [];
        for (const r of rows) {
          const idR = PayableId.rehydrate(r.id);
          const status = toDocStatus(r.status);
          if (!idR.ok || status === null) {
            logStore('findSnapshotsByIds:map', `${r.id}/${r.status}`);
            return err('payable-view-failure');
          }
          snapshots.push({ id: idR.value, status, valueCents: r.value });
        }
        return ok(snapshots);
      } catch (cause) {
        logStore('findSnapshotsByIds', cause);
        return err('payable-view-failure');
      }
    },

    searchPaid: async (): Promise<
      Result<readonly PaidPayableView[], PayableReconciliationViewError>
    > => {
      try {
        const rows = await db
          .select({
            id: finPayables.id,
            documentId: finPayables.documentId,
            value: finPayables.value,
            dueDate: finPayables.dueDate,
            paymentMethod: finPayables.paymentMethod,
            // M2/#268: o LEFT JOIN com fin_documents já existia (para o filtro de status); os 5 refs
            // saem dele sem custo de query nova.
            kind: finPayables.kind,
            programRef: finDocuments.programRef,
            budgetPlanRef: finDocuments.budgetPlanRef,
            costCenterRef: finDocuments.costCenterRef,
            categoryRef: finDocuments.categoryRef,
            subcategoryRef: finDocuments.subcategoryRef,
          })
          .from(finPayables)
          // #323 (regressão): "todo título pago aparece na conciliação". O grid Contas a Pagar deriva
          // o PAGO do DOCUMENTO, então as retenções (IRRF/CSRF ainda Open/Approved) de um doc pago
          // precisam aparecer — paridade com o grid. O OR cobre também o título individualmente Paid
          // (líquido, ou a borda de doc não-Pago). Salvaguarda: não reofertar os já `Reconciled`.
          .leftJoin(finDocuments, eq(finPayables.documentId, finDocuments.id))
          .where(
            and(
              or(eq(finDocuments.status, 'Paid'), eq(finPayables.status, 'Paid')),
              ne(finPayables.status, 'Reconciled'),
            ),
          );
        return ok(
          rows.map((r) => ({
            id: r.id,
            documentId: r.documentId,
            valueCents: r.value,
            dueDate: r.dueDate,
            paymentMethod: r.paymentMethod,
            kind: r.kind,
            programRef: r.programRef,
            budgetPlanRef: r.budgetPlanRef,
            costCenterRef: r.costCenterRef,
            categoryRef: r.categoryRef,
            subcategoryRef: r.subcategoryRef,
          })),
        );
      } catch (cause) {
        logStore('searchPaid', cause);
        return err('payable-view-failure');
      }
    },
  };
};
