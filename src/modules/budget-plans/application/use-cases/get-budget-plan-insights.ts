import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';
import type {
  RealizedByPlanReader,
  RealizedByPlanReadError,
} from '../ports/realized-by-plan-reader.ts';
import { planTotalCents, budgetIdsOf } from '../read-models/plan-total.ts';

// Planejado (`totalInCents`) + Realizado (`realizedInCents` — Σ conciliado do plano, via reader do
// financial; 0 quando o plano não tem conciliados). Aditivo: o Planejado permanece inalterado.
export type YearTotal = Readonly<{
  year: number;
  totalInCents: number;
  realizedInCents: number;
}>;

// Insights ano-a-ano: Planejado × Realizado do plano atual vs. os planos-raiz de anos anteriores do
// mesmo programa. O Realizado (conciliado) vem do `financial` via port/ACL (decisão da P.O. #416 —
// o Insight passa a mostrar Realizado real). `networksCount` = nº de Redes do plano atual.
export type BudgetPlanInsights = Readonly<{
  current: YearTotal;
  previousYears: readonly YearTotal[]; // anos anteriores, mais recente primeiro
  networksCount: number;
}>;

export type GetBudgetPlanInsightsError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | BudgetPlanRepositoryError
  | BudgetResultRepositoryError
  | RealizedByPlanReadError;

export type GetBudgetPlanInsightsDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  budgetResultRepo: BudgetResultRepository;
  realizedReader: RealizedByPlanReader;
}>;

// Janela de comparação (planos por programa ao longo dos anos são poucos; teto conservador).
const LOOKBACK_LIMIT = 100;

export const getBudgetPlanInsights =
  (deps: GetBudgetPlanInsightsDeps) =>
  async (planIdRaw: string): Promise<Result<BudgetPlanInsights, GetBudgetPlanInsightsError>> => {
    const planId = BudgetPlanId.rehydrate(planIdRaw);
    if (!planId.ok) return planId;

    const found = await deps.planRepo.findById(planId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');
    const plan = found.value;

    const page = await deps.planRepo.listPaged({
      page: 1,
      limit: LOOKBACK_LIMIT,
      programRef: plan.programRef,
    });
    if (!page.ok) return page;

    const previousPlans = page.value.items
      .filter((p) => p.parentId === null && p.year < plan.year)
      .toSorted((a, b) => b.year - a.year);

    // Correlação plano↔ref: `budget_plan_ref = id do plano`. Um único batch com o plano atual +
    // todos os anos anteriores exibidos (anti-N+1). Ref ausente do Map ⇒ Realizado 0.
    const refs = [String(plan.id), ...previousPlans.map((p) => String(p.id))];
    const realized = await deps.realizedReader.getByPlans(refs);
    if (!realized.ok) return realized;
    const realizedByRef = realized.value;

    // #458 — Planejado derivado: uma agregação de somas para o plano atual + todos os anteriores.
    const sums = await deps.budgetResultRepo.sumByBudgetIds(budgetIdsOf([plan, ...previousPlans]));
    if (!sums.ok) return sums;

    const previousYears = previousPlans.map((p) => ({
      year: p.year,
      totalInCents: planTotalCents(p, sums.value),
      realizedInCents: realizedByRef.get(String(p.id)) ?? 0,
    }));

    return ok({
      current: {
        year: plan.year,
        totalInCents: planTotalCents(plan, sums.value),
        realizedInCents: realizedByRef.get(String(plan.id)) ?? 0,
      },
      previousYears,
      networksCount: plan.budgets.length,
    });
  };
