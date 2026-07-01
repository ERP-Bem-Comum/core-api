// Adapter Drizzle do PayableViewStore (read-model de payables — #235 / ADR-0022).
//
// `upsert`: INSERT ... ON DUPLICATE KEY UPDATE (ADR-0020 §"ON DUPLICATE KEY UPDATE permitido").
//   Atualiza os campos descritivos; NÃO sobrescreve `status` (dono dos eventos de transição —
//   reprocessar DocumentSaved não regride o status já projetado).
// `updateStatus`: UPDATE status WHERE payable_id IN (...) — transições Approved/Paid/Cancelled/Open.
// `list`: SELECT * (base para os widgets da Camada 1-2).
//
// Boundary: todo try/catch converte para Result (.claude/rules/adapters.md).

import { inArray, sql, eq, and, desc, isNotNull } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type {
  PayableViewStore,
  PayableViewStoreError,
} from '#src/modules/financial/application/ports/payable-view-store.ts';
import type { PayableView } from '#src/modules/financial/domain/payable-view/types.ts';
import { rowToPayableView } from '#src/modules/financial/adapters/persistence/mappers/payable-view.mapper.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finPayableView } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-payable-view-store] ${op} failed: ${String(cause)}\n`);
};

const incoming = (column: string): ReturnType<typeof sql.raw> => sql.raw(`values(\`${column}\`)`);

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
              debitAccountRef: r.debitAccountRef,
              paidAt: r.paidAt,
              updatedAt: now,
            })),
          )
          .onDuplicateKeyUpdate({
            // `status` e `paid_at` ficam de fora de propósito (donos dos eventos de transição /
            // markPaid — reprocessar DocumentSaved não regride status nem apaga a data de pagamento).
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
              debitAccountRef: incoming('debit_account_ref'),
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

    markPaid: async (payableIds, paidAt): Promise<Result<void, PayableViewStoreError>> => {
      if (payableIds.length === 0) return ok(undefined);
      try {
        await db
          .update(finPayableView)
          .set({ status: 'Paid', paidAt, updatedAt: clock.now() })
          .where(inArray(finPayableView.payableId, [...payableIds]));
        return ok(undefined);
      } catch (cause) {
        logStore('markPaid', cause);
        return err('payable-view-store-unavailable');
      }
    },

    list: async (): Promise<Result<readonly PayableView[], PayableViewStoreError>> => {
      try {
        const dbRows = await db.select().from(finPayableView);
        const out: PayableView[] = [];
        for (const row of dbRows) {
          // Mapper valida os enums vindos do banco; corrupção → erro (não reclassifica).
          const mapped = rowToPayableView(row);
          if (!mapped.ok) {
            logStore('list:map', mapped.error);
            return err('payable-view-row-invalid');
          }
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logStore('list', cause);
        return err('payable-view-store-unavailable');
      }
    },

    listRecentPaid: async (
      limit,
    ): Promise<Result<readonly PayableView[], PayableViewStoreError>> => {
      try {
        const dbRows = await db
          .select()
          .from(finPayableView)
          .where(and(eq(finPayableView.status, 'Paid'), isNotNull(finPayableView.paidAt)))
          .orderBy(desc(finPayableView.paidAt))
          .limit(limit);
        const out: PayableView[] = [];
        for (const row of dbRows) {
          const mapped = rowToPayableView(row);
          if (!mapped.ok) {
            logStore('listRecentPaid:map', mapped.error);
            return err('payable-view-row-invalid');
          }
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logStore('listRecentPaid', cause);
        return err('payable-view-store-unavailable');
      }
    },
  };
};
