import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';

export type YearTotal = Readonly<{ year: number; totalInCents: number }>;

// CA3 (redefinido) — insights ano-a-ano: total planejado do plano atual vs. os planos-raiz de anos
// anteriores do mesmo programa. Autocontido no budget-plans (o Planejado×Realizado é o módulo reports/032).
export type BudgetPlanInsights = Readonly<{
  current: YearTotal;
  previousYears: readonly YearTotal[]; // anos anteriores, mais recente primeiro
}>;

export type GetBudgetPlanInsightsError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | BudgetPlanRepositoryError;

export type GetBudgetPlanInsightsDeps = Readonly<{ planRepo: BudgetPlanRepository }>;

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

    const previousYears = page.value.items
      .filter((p) => p.parentId === null && p.year < plan.year)
      .map((p) => ({ year: p.year, totalInCents: BudgetPlan.total(p).cents }))
      .toSorted((a, b) => b.year - a.year);

    return ok({
      current: { year: plan.year, totalInCents: BudgetPlan.total(plan).cents },
      previousYears,
    });
  };
