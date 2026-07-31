/**
 * DASHBOARD-REALIZED-READ — Port de LEITURA (read-only) do widget "Realizado x Previsto mensal" do
 * Dashboard (DASH-F4 · parte do #112).
 *
 * Cross-módulo: costura o ORÇADO (`budget-plans`) x o REALIZADO (`financial`) por MÊS, para UM plano
 * selecionado num exercício. A costura (`adapters/persistence/dashboard-realized-read.from-sources.ts`)
 * lê as duas fontes SÓ via public-api (ADR-0006) e faz o rollup mensal em memória (sem JOIN
 * cross-módulo — ADR-0014).
 *
 * Decisão da P.O. (2026-07-30):
 *  - Realizado = títulos CONCILIADOS (Σ `reconciled_value_cents` das conciliações Active, por
 *    `reconciled_at`) — o `realizedCents` do reader do financial. O `provisionedCents` é IGNORADO.
 *  - Previsto = Plano Orçamentário (orçado do `budget-plans`) — NÃO o provisionado do financial.
 *  - Escopo = UM plano (`budgetPlanId` obrigatório) + `year`. Série de 12 meses.
 *
 * A GRADE DE 12 MESES É CONTRATO: `chart` tem EXATAMENTE 12 pontos (mês 1..12, ascendente); meses sem
 * dado = 0 (a grade de 12 do planned garante o mês; o realized preenche onde houver).
 */
import type { Result } from '#src/shared/primitives/result.ts';

/** Um ponto da série mensal: mês 1..12 + as duas medidas em cents. */
export type DashboardRealizedChartPoint = Readonly<{
  month: number;
  expectedCents: number;
  realizedCents: number;
}>;

/** A série inteira de um plano num exercício: 12 pontos ordenados 1..12. */
export type DashboardRealizedChart = Readonly<{
  budgetPlanId: string;
  year: number;
  chart: readonly DashboardRealizedChartPoint[];
}>;

/** Union nomeada (não `string` cru): o consumidor faz switch exaustivo. Fail-closed (S6/#502). */
export type DashboardRealizedReadError = 'dashboard-realized-read-unavailable';

/** Query do widget: plano + exercício, ambos obrigatórios (o BFF/front passa o plano ativo). */
export type DashboardRealizedQuery = Readonly<{
  budgetPlanId: string;
  year: number;
}>;

export type DashboardRealizedReadPort = Readonly<{
  list: (
    q: DashboardRealizedQuery,
  ) => Promise<Result<DashboardRealizedChart, DashboardRealizedReadError>>;
}>;
