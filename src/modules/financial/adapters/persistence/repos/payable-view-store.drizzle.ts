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
    upsert: async (viewRows, occurredAt): Promise<Result<void, PayableViewStoreError>> => {
      if (viewRows.length === 0) return ok(undefined);
      try {
        const now = clock.now();
        // #894 — guard de recência (molde de `supplier-view-store.drizzle.ts:43`, exigido pela
        // `.claude/rules/adapters.md` citando o ADR-0045): a linha só é sobrescrita quando o evento
        // entrante é >= o que a escreveu. Sem ele, reentregar um `DocumentSaved` antigo apaga a
        // reclassificação — e a entrega É repetida por desenho (at-least-once).
        //
        // ⚠️ `>=` e não `>`, como no irmão: reaplicar o MESMO evento tem de continuar sendo idempotente
        // (é o que cura uma projeção que ficou para trás). O empate real de `occurred_at` entre dois
        // eventos DIFERENTES do mesmo documento é possível — `fsp: 3` —, e nesse caso a ordem volta a
        // ser indeterminada; não há segunda coluna de ordenação no read-model para desempatar, e
        // inventar uma aqui seria decidir por conta própria um contrato que é do outbox.
        const fresher = sql`${incoming('occurred_at')} >= ${finPayableView.occurredAt}`;
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
              budgetPlanRef: r.budgetPlanRef,
              subcategoryRef: r.subcategoryRef,
              costCenterRef: r.costCenterRef,
              programRef: r.programRef,
              valueCents: r.valueCents,
              dueDate: r.dueDate,
              status: r.status,
              debitAccountRef: r.debitAccountRef,
              paidAt: r.paidAt,
              updatedAt: now,
              occurredAt,
            })),
          )
          .onDuplicateKeyUpdate({
            // `status` e `paid_at` ficam de fora de propósito (donos dos eventos de transição /
            // markPaid — reprocessar DocumentSaved não regride status nem apaga a data de pagamento).
            //
            // Todo o resto passa pelo `if(fresher, …)`: um evento atrasado não altera campo nenhum,
            // em vez de alterar alguns e deixar a linha meio velha e meio nova.
            set: {
              documentId: sql`if(${fresher}, ${incoming('document_id')}, ${finPayableView.documentId})`,
              kind: sql`if(${fresher}, ${incoming('kind')}, ${finPayableView.kind})`,
              retentionType: sql`if(${fresher}, ${incoming('retention_type')}, ${finPayableView.retentionType})`,
              supplierRef: sql`if(${fresher}, ${incoming('supplier_ref')}, ${finPayableView.supplierRef})`,
              contractRef: sql`if(${fresher}, ${incoming('contract_ref')}, ${finPayableView.contractRef})`,
              categoryRef: sql`if(${fresher}, ${incoming('category_ref')}, ${finPayableView.categoryRef})`,
              budgetPlanRef: sql`if(${fresher}, ${incoming('budget_plan_ref')}, ${finPayableView.budgetPlanRef})`,
              // M2/RN-M2-05: a reclassificação chega por REPROJEÇÃO — o `DocumentSaved` reemitido
              // reescreve pai e filhos. Deixar a subcategoria fora deste `set` faria a linha nascer
              // com a folha certa e nunca mais atualizá-la, que é a forma silenciosa de o relatório
              // mentir depois de uma reclassificação.
              subcategoryRef: sql`if(${fresher}, ${incoming('subcategory_ref')}, ${finPayableView.subcategoryRef})`,
              costCenterRef: sql`if(${fresher}, ${incoming('cost_center_ref')}, ${finPayableView.costCenterRef})`,
              programRef: sql`if(${fresher}, ${incoming('program_ref')}, ${finPayableView.programRef})`,
              valueCents: sql`if(${fresher}, ${incoming('value_cents')}, ${finPayableView.valueCents})`,
              dueDate: sql`if(${fresher}, ${incoming('due_date')}, ${finPayableView.dueDate})`,
              debitAccountRef: sql`if(${fresher}, ${incoming('debit_account_ref')}, ${finPayableView.debitAccountRef})`,
              updatedAt: sql`if(${fresher}, ${incoming('updated_at')}, ${finPayableView.updatedAt})`,
              occurredAt: sql`if(${fresher}, ${incoming('occurred_at')}, ${finPayableView.occurredAt})`,
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
