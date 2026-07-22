/**
 * Mapeadores dos outcomes dos use cases de budget-plans -> DTOs HTTP. A casca da borda
 * serializa branded types (`BudgetPlanId`, `ProgramRef`) como string e datas como ISO-8601.
 */

import * as PlanVersion from '#src/modules/budget-plans/domain/budget-plan/version.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { CreateBudgetPlanOutcome } from '#src/modules/budget-plans/application/use-cases/create-budget-plan.ts';
import type { BudgetPlanListItem } from '#src/modules/budget-plans/application/use-cases/list-budget-plans.ts';
import type { BudgetPlanDetail } from '#src/modules/budget-plans/application/use-cases/get-budget-plan.ts';
import type {
  CreateBudgetPlanResponseDto,
  BudgetPlanListItemDto,
  BudgetPlanDetailDto,
  LifecyclePlanResponseDto,
} from './schemas.ts';

/**
 * Resposta das transições de ciclo de vida (US4): plano resultante + total.
 * #458 — `totalInCents` é DERIVADO dos lançamentos e vem computado do use case (calibração/cenário
 * nascem vazios → 0; aprovar preserva os orçamentos → a soma real). O DTO não recalcula.
 */
export const lifecyclePlanToDto = (
  plan: BudgetPlanEntity,
  totalInCents: number,
): LifecyclePlanResponseDto => ({
  id: String(plan.id),
  year: plan.year,
  programRef: String(plan.programRef),
  status: plan.status,
  version: PlanVersion.format(plan.version),
  scenarioName: plan.scenarioName,
  parentId: plan.parentId === null ? null : String(plan.parentId),
  totalInCents,
});

/** Resposta do POST /budget-plans (cabeçalho recém-criado, sem budgets — nasce vazio → total 0). */
export const createBudgetPlanToDto = (
  outcome: CreateBudgetPlanOutcome,
): CreateBudgetPlanResponseDto => ({
  id: String(outcome.plan.id),
  year: outcome.plan.year,
  programRef: String(outcome.plan.programRef),
  status: outcome.plan.status,
  version: PlanVersion.format(outcome.plan.version),
  totalInCents: 0,
});

/** Item enxuto da listagem (GET /budget-plans). */
export const budgetPlanListItemToDto = (item: BudgetPlanListItem): BudgetPlanListItemDto => ({
  id: item.id,
  year: item.year,
  status: item.status,
  version: item.version,
  programRef: item.programRef,
  programName: item.programName,
  totalInCents: item.totalInCents,
  updatedAt: item.updatedAt.toISOString(),
  updatedByRef: item.updatedByRef,
  partnersCount: item.partnersCount,
  networkKind: item.networkKind,
  parentId: item.parentId,
  scenarioName: item.scenarioName,
});

/** Detalhe completo (GET /budget-plans/:id). */
export const budgetPlanDetailToDto = (detail: BudgetPlanDetail): BudgetPlanDetailDto => ({
  id: detail.id,
  year: detail.year,
  status: detail.status,
  version: detail.version,
  programRef: detail.programRef,
  programName: detail.programName,
  // Spread: o schema Zod infere array mutável; `detail.budgets` é `readonly Budget[]` (domínio).
  budgets: [...detail.budgets],
  totalInCents: detail.totalInCents,
  createdAt: detail.createdAt.toISOString(),
  updatedAt: detail.updatedAt.toISOString(),
  updatedByRef: detail.updatedByRef,
});
