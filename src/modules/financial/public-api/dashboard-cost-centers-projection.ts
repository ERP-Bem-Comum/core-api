/**
 * Reader boot-scoped do KPI "Despesas Pagas por Centro de Custo" (DASH-F1 · #241) — public-api do
 * financial.
 *
 * Agrega `fin_payable_view` (#235) por Centro de Custo em DOIS baldes de MÊS, num único SELECT com
 * dois CASE-SUM sobre `paid_at` (WHERE status='Paid'):
 *  - m1Cents = Σ value_cents WHERE paid_at ∈ [m1Start, m1End)   (mês de referência — M-1)
 *  - m2Cents = Σ value_cents WHERE paid_at ∈ [m2Start, m2End)   (mês anterior — M-2)
 * GROUP BY cost_center_ref (+ nome via LEFT JOIN `fin_cost_centers`, como no Relatório Geral #442).
 * NÃO há eixo além do Centro de Custo — a seleção de total/top/percentual é montada na borda
 * (assembler puro `dashboardCostCentersToDto`), reusando o motor de variação #237.
 *
 * As JANELAS são INPUT do método (por requisição), não boot-time: o handler computa
 * `comparisonWindows(clock.now())` (M-1 vs M-2, motor #237) e passa as 4 bordas half-open aqui.
 * `WHERE status='Paid'` é a base de "Despesas Pagas"; retenções-filhas de um documento pago ficam
 * Open/Approved (#323), então não inflam a soma — sem necessidade de filtro `kind='Parent'`.
 *
 * **Boot-scoped:** pool aberto uma vez, reusado, fechado no `close()` — nunca por requisição
 * (incidente RDS 0001). Molde: `openSuppliersWithoutContractReader` / `openCashflowReader`.
 *
 * ADR-0020 §"Features permitidas": GROUP BY/agregação, LEFT JOIN, CASE.
 */
import { and, eq, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import { finPayableView, finCostCenters } from '../adapters/persistence/schemas/mysql.ts';

// Agregado BRUTO por Centro de Custo: os dois baldes de mês crus. `ref`/`name` podem ser null
// (título sem centro de custo é grupo válido; nome ainda não presente em fin_cost_centers).
export type DashboardCostCenterRow = Readonly<{
  ref: string | null;
  name: string | null;
  m1Cents: number;
  m2Cents: number;
}>;

// Janelas half-open [start, end) das duas comparações (M-1 e M-2). Vêm de
// `comparisonWindows(reference)` (#237) na borda — Datas UTC; o reader as reduz a 'YYYY-MM-DD'
// para comparar com a coluna date `paid_at`.
export type DashboardCostCentersWindows = Readonly<{
  m1Start: Date;
  m1End: Date;
  m2Start: Date;
  m2End: Date;
}>;

export type DashboardCostCentersReader = Readonly<{
  list: (
    windows: DashboardCostCentersWindows,
  ) => Promise<Result<readonly DashboardCostCenterRow[], string>>;
  close: () => Promise<void>;
}>;

// Coluna `paid_at` é date (mode:'string') → 'YYYY-MM-DD'. Compara com a fronteira reduzida ao mesmo
// formato (lexicográfico = cronológico para datas ISO).
const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);

export const openDashboardCostCentersReader = async (
  opts: Readonly<{ connectionString: string }>,
): Promise<Result<DashboardCostCentersReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  type AggregationRow = Readonly<{
    ref: string | null;
    name: string | null;
    // mysql2 devolve SUM (DECIMAL) como string; Number() no mapper.
    m1Cents: string;
    m2Cents: string;
  }>;

  return ok({
    list: async (windows) => {
      try {
        const m1Start = toDateOnly(windows.m1Start);
        const m1End = toDateOnly(windows.m1End);
        const m2Start = toDateOnly(windows.m2Start);
        const m2End = toDateOnly(windows.m2End);
        // Dois CASE-SUM sobre paid_at (half-open [start, end)). paid_at NULL → condição falsa → ELSE 0.
        const m1Sum = sql<string>`sum(case when ${finPayableView.paidAt} >= ${m1Start} and ${finPayableView.paidAt} < ${m1End} then ${finPayableView.valueCents} else 0 end)`;
        const m2Sum = sql<string>`sum(case when ${finPayableView.paidAt} >= ${m2Start} and ${finPayableView.paidAt} < ${m2End} then ${finPayableView.valueCents} else 0 end)`;

        const rows: readonly AggregationRow[] = await db
          .select({
            ref: finPayableView.costCenterRef,
            name: finCostCenters.name,
            m1Cents: m1Sum,
            m2Cents: m2Sum,
          })
          .from(finPayableView)
          .leftJoin(finCostCenters, eq(finPayableView.costCenterRef, finCostCenters.id))
          // Base "Despesas Pagas": só títulos pagos (retenções-filhas de doc pago ficam Open/Approved).
          .where(and(eq(finPayableView.status, 'Paid')))
          .groupBy(finPayableView.costCenterRef, finCostCenters.name);

        return ok(
          rows.map((row) => ({
            ref: row.ref,
            name: row.name,
            m1Cents: Number(row.m1Cents),
            m2Cents: Number(row.m2Cents),
          })),
        );
      } catch (cause) {
        process.stderr.write(`[fin-dashboard-cost-centers:list] ${String(cause)}\n`);
        return err('dashboard-cost-centers-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
