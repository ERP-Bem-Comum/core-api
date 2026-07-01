// Adapter Drizzle do PayableViewStore (read-model de payables — #235 / ADR-0022).
//
// `upsert`: INSERT ... ON DUPLICATE KEY UPDATE (ADR-0020 §"ON DUPLICATE KEY UPDATE permitido").
//   Atualiza os campos descritivos; NÃO sobrescreve `status` (dono dos eventos de transição —
//   reprocessar DocumentSaved não regride o status já projetado).
// `updateStatus`: UPDATE status WHERE payable_id IN (...) — transições Approved/Paid/Cancelled/Open.
// `list`: SELECT * (base para os widgets da Camada 1-2).
//
// Boundary: todo try/catch converte para Result (.claude/rules/adapters.md).

import { inArray, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type {
  PayableViewStore,
  PayableViewStoreError,
} from '#src/modules/financial/application/ports/payable-view-store.ts';
import type {
  PayableView,
  PayableViewStatus,
} from '#src/modules/financial/domain/payable-view/types.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finPayableView } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-payable-view-store] ${op} failed: ${String(cause)}\n`);
};

const incoming = (column: string): ReturnType<typeof sql.raw> => sql.raw(`values(\`${column}\`)`);

const toStatus = (raw: string): PayableViewStatus =>
  raw === 'Approved' || raw === 'Paid' || raw === 'Cancelled' ? raw : 'Open';

export const createDrizzlePayableViewStore = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): PayableViewStore => {
  const { db } = handle;

  return {
    upsert: async (viewRows): Promise<Result<void, PayableViewStoreError>> => {
      if (viewRows.length === 0) return ok(undefined);
      try {
        const now = clock.now();
        await db
          .insert(finPayableView)
          .values(
            viewRows.map((r) => ({
              payableId: r.payableId,
              documentId: r.documentId,
              kind: r.kind,
              retentionType: r.retentionType,
              supplierRef: r.supplierRef,
              contractRef: r.contractRef,
              categoryRef: r.categoryRef,
              costCenterRef: r.costCenterRef,
              programRef: r.programRef,
              valueCents: r.valueCents,
              dueDate: r.dueDate,
              status: r.status,
              updatedAt: now,
            })),
          )
          .onDuplicateKeyUpdate({
            // `status` fica de fora de propósito (dono dos eventos de transição).
            set: {
              documentId: incoming('document_id'),
              kind: incoming('kind'),
              retentionType: incoming('retention_type'),
              supplierRef: incoming('supplier_ref'),
              contractRef: incoming('contract_ref'),
              categoryRef: incoming('category_ref'),
              costCenterRef: incoming('cost_center_ref'),
              programRef: incoming('program_ref'),
              valueCents: incoming('value_cents'),
              dueDate: incoming('due_date'),
              updatedAt: incoming('updated_at'),
            },
          });
        return ok(undefined);
      } catch (cause) {
        logStore('upsert', cause);
        return err('payable-view-store-unavailable');
      }
    },

    updateStatus: async (payableIds, status): Promise<Result<void, PayableViewStoreError>> => {
      if (payableIds.length === 0) return ok(undefined);
      try {
        await db
          .update(finPayableView)
          .set({ status, updatedAt: clock.now() })
          .where(inArray(finPayableView.payableId, [...payableIds]));
        return ok(undefined);
      } catch (cause) {
        logStore('updateStatus', cause);
        return err('payable-view-store-unavailable');
      }
    },

    list: async (): Promise<Result<readonly PayableView[], PayableViewStoreError>> => {
      try {
        const dbRows = await db.select().from(finPayableView);
        return ok(
          dbRows.map((row) => ({
            payableId: row.payableId,
            documentId: row.documentId,
            kind: row.kind === 'Child' ? 'Child' : 'Parent',
            retentionType: row.retentionType,
            supplierRef: row.supplierRef,
            contractRef: row.contractRef,
            categoryRef: row.categoryRef,
            costCenterRef: row.costCenterRef,
            programRef: row.programRef,
            valueCents: row.valueCents,
            dueDate: row.dueDate,
            status: toStatus(row.status),
          })),
        );
      } catch (cause) {
        logStore('list', cause);
        return err('payable-view-store-unavailable');
      }
    },
  };
};
