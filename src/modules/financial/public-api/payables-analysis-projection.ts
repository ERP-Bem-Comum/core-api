/**
 * Reader boot-scoped da "Análise de Pagamentos" (REPORTS-ANALYSIS-PAYABLES · REP-3 · #114/#446) —
 * public-api do financial.
 *
 * Agrega `fin_payable_view` (#235) na grão **Plano Orçamentário × Centro de Custo × mês**
 * (`DATE_FORMAT(due_date,'%Y-%m')`), somando `value_cents`. #446 Slice C: a raiz da árvore passa a
 * ser o Plano Orçamentário (`budget_plan_ref`, carimbado no Slice B) — a CATEGORIA SAI do grão
 * (spec 051: Plano → CC, 2 níveis). Filtra por período half-open `[dueStart, dueEnd)` (como o
 * `dashboard.monthWindow`) e status opcional; exclui `Cancelled`. Nome da folha (CC) via LEFT JOIN
 * `fin_cost_centers` (nullable → grupo "sem CC"). O rótulo do plano é costurado no `reports` via
 * `budget-plans/public-api` (sem JOIN cross-módulo aqui — ADR-0006/0014). O consumidor aninha as
 * rows planas em `AnalysisReport`.
 *
 * **Boot-scoped:** pool aberto uma vez, fechado no `close()` (F1 do #238 / incidente RDS 0001).
 * ADR-0020 §"Features permitidas": GROUP BY/agregação, LEFT JOIN, funções de data.
 */
import { and, eq, gte, lt, ne, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import { finPayableView, finCostCenters } from '../adapters/persistence/schemas/mysql.ts';

export type PayablesAnalysisFilter = Readonly<{
  dueStart: string; // 'YYYY-MM-DD' inclusivo
  dueEnd: string; // 'YYYY-MM-DD' exclusivo (half-open)
  status?: string;
}>;

export type PayablesAnalysisRow = Readonly<{
  budgetPlanRef: string | null;
  costCenterRef: string | null;
  costCenterName: string | null;
  monthYear: string; // 'YYYY-MM'
  totalCents: number;
}>;

export type PayablesAnalysisReader = Readonly<{
  list: (filter: PayablesAnalysisFilter) => Promise<Result<readonly PayablesAnalysisRow[], string>>;
  close: () => Promise<void>;
}>;

export const openPayablesAnalysisReader = async (
  opts: Readonly<{ connectionString: string }>,
): Promise<Result<PayablesAnalysisReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  return ok({
    list: async (filter) => {
      try {
        const monthYear = sql<string>`date_format(${finPayableView.dueDate}, '%Y-%m')`;
        const rows = await db
          .select({
            budgetPlanRef: finPayableView.budgetPlanRef,
            costCenterRef: finPayableView.costCenterRef,
            costCenterName: finCostCenters.name,
            monthYear,
            // mysql2 devolve SUM (DECIMAL) como string → Number() no mapper.
            totalCents: sql<string>`sum(${finPayableView.valueCents})`,
          })
          .from(finPayableView)
          .leftJoin(finCostCenters, eq(finPayableView.costCenterRef, finCostCenters.id))
          .where(
            and(
              gte(finPayableView.dueDate, filter.dueStart),
              lt(finPayableView.dueDate, filter.dueEnd),
              ne(finPayableView.status, 'Cancelled'),
              filter.status !== undefined ? eq(finPayableView.status, filter.status) : undefined,
            ),
          )
          .groupBy(
            finPayableView.budgetPlanRef,
            finPayableView.costCenterRef,
            finCostCenters.name,
            monthYear,
          );

        return ok(
          rows.map((row) => ({
            budgetPlanRef: row.budgetPlanRef,
            costCenterRef: row.costCenterRef,
            costCenterName: row.costCenterName,
            monthYear: row.monthYear,
            totalCents: Number(row.totalCents),
          })),
        );
      } catch (cause) {
        process.stderr.write(`[fin-payables-analysis:list] ${String(cause)}\n`);
        return err('payables-analysis-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
