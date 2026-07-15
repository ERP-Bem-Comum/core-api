/**
 * REALIZED-BY-PLAN-READER — Port de LEITURA (read-only) do "Realizado" do plano orçamentário
 * (BGP-INSIGHTS-REALIZED · #416).
 *
 * Realizado = Σ conciliado (reconciliações Active) dos títulos vinculados ao plano — lido do
 * `financial` via ACL (o estado "conciliado" vive inteiro naquele módulo). Chave do Map =
 * `budget_plan_ref` (= id do plano); ref ausente do Map ⇒ 0 (plano sem conciliados). O insights
 * consulta todos os refs exibidos (atual + anos anteriores) num único batch (anti-N+1).
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type RealizedByPlanReadError = 'realized-by-plan-read-unavailable';

export type RealizedByPlanReader = Readonly<{
  getByPlans: (
    refs: readonly string[],
  ) => Promise<Result<ReadonlyMap<string, number>, RealizedByPlanReadError>>;
}>;
