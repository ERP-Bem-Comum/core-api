/**
 * Reader boot-scoped da "Posição de Pagamentos" (REPORTS-PAYMENT-POSITION · #243 REP-4) —
 * public-api do financial.
 *
 * Agrega `fin_payable_view` (#235) na grão Fornecedor × Centro de Custo × Categoria em 3 baldes:
 *  - PENDENTE = status IN ('Open','Approved')
 *  - PAGO     = status = 'Paid'
 *  - ATRASADO = status IN ('Open','Approved') AND due_date < hoje (derivado na leitura; SPIKE-233 Mapa C)
 * `Cancelled` é excluído. Nomes via LEFT JOIN: `fin_supplier_view` (event-loaded → nullable),
 * `fin_cost_centers`, `fin_categories` (referência local). Método de pagamento (cartão) não vive no
 * read-model e não filtra a agregação — incluído sem tratamento especial.
 *
 * **Boot-scoped:** pool aberto uma vez, fechado no `close()` (F1 do #238 / incidente RDS 0001).
 * `hoje` vem de `clock.today()` (PlainDate → 'YYYY-MM-DD'), testável via ClockFixed — nunca `new Date()`.
 *
 * ADR-0020 §"Features permitidas": GROUP BY/agregação, LEFT JOIN, CASE.
 */
import { eq, ne, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import { toISOString as plainDateToISO } from '#src/shared/kernel/plain-date.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import {
  finPayableView,
  finSupplierView,
  finCostCenters,
  finCategories,
} from '../adapters/persistence/schemas/mysql.ts';

export type PaymentPositionRow = Readonly<{
  supplierRef: string | null;
  supplierName: string | null;
  costCenterRef: string | null;
  costCenterName: string | null;
  categoryRef: string | null;
  categoryName: string | null;
  pendingCents: number;
  paidCents: number;
  overdueCents: number;
}>;

export type PaymentPositionReader = Readonly<{
  list: () => Promise<Result<readonly PaymentPositionRow[], string>>;
  close: () => Promise<void>;
}>;

export const openPaymentPositionReader = async (
  opts: Readonly<{ connectionString: string; clock: Clock }>,
): Promise<Result<PaymentPositionReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  return ok({
    list: async () => {
      try {
        const today = plainDateToISO(opts.clock.today());
        const rows = await db
          .select({
            supplierRef: finPayableView.supplierRef,
            supplierName: finSupplierView.name,
            costCenterRef: finPayableView.costCenterRef,
            costCenterName: finCostCenters.name,
            categoryRef: finPayableView.categoryRef,
            categoryName: finCategories.name,
            // mysql2 devolve SUM (DECIMAL) como string → Number() no mapper.
            pendingCents: sql<string>`sum(case when ${finPayableView.status} in ('Open','Approved') then ${finPayableView.valueCents} else 0 end)`,
            paidCents: sql<string>`sum(case when ${finPayableView.status} = 'Paid' then ${finPayableView.valueCents} else 0 end)`,
            overdueCents: sql<string>`sum(case when ${finPayableView.status} in ('Open','Approved') and ${finPayableView.dueDate} < ${today} then ${finPayableView.valueCents} else 0 end)`,
          })
          .from(finPayableView)
          .leftJoin(finSupplierView, eq(finPayableView.supplierRef, finSupplierView.supplierRef))
          .leftJoin(finCostCenters, eq(finPayableView.costCenterRef, finCostCenters.id))
          .leftJoin(finCategories, eq(finPayableView.categoryRef, finCategories.id))
          .where(ne(finPayableView.status, 'Cancelled'))
          .groupBy(
            finPayableView.supplierRef,
            finSupplierView.name,
            finPayableView.costCenterRef,
            finCostCenters.name,
            finPayableView.categoryRef,
            finCategories.name,
          );

        return ok(
          rows.map((row) => ({
            supplierRef: row.supplierRef,
            supplierName: row.supplierName,
            costCenterRef: row.costCenterRef,
            costCenterName: row.costCenterName,
            categoryRef: row.categoryRef,
            categoryName: row.categoryName,
            pendingCents: Number(row.pendingCents),
            paidCents: Number(row.paidCents),
            overdueCents: Number(row.overdueCents),
          })),
        );
      } catch (cause) {
        process.stderr.write(`[fin-payment-position:list] ${String(cause)}\n`);
        return err('payment-position-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
