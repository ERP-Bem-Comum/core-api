/**
 * Mapeadores dos outcomes dos use cases de budget-plans -> DTOs HTTP. A casca da borda
 * serializa branded types (`BudgetPlanId`, `ProgramRef`) como string e datas como ISO-8601.
 */

import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as PlanVersion from '#src/modules/budget-plans/domain/budget-plan/version.ts';
import type { CreateBudgetPlanOutcome } from '#src/modules/budget-plans/application/use-cases/create-budget-plan.ts';
import type { BudgetPlanListItem } from '#src/modules/budget-plans/application/use-cases/list-budget-plans.ts';
import type { BudgetPlanDetail } from '#src/modules/budget-plans/application/use-cases/get-budget-plan.ts';
import type {
  CreateBudgetPlanResponseDto,
  BudgetPlanListItemDto,
  BudgetPlanDetailDto,
} from './schemas.ts';

/** Resposta do POST /budget-plans (cabeçalho recém-criado, sem budgets — nasce vazio). */
export const createBudgetPlanToDto = (
  outcome: CreateBudgetPlanOutcome,
): CreateBudgetPlanResponseDto => ({
  id: String(outcome.plan.id),
  year: outcome.plan.year,
  programRef: String(outcome.plan.programRef),
  status: outcome.plan.status,
  version: PlanVersion.format(outcome.plan.version),
  totalInCents: BudgetPlan.total(outcome.plan).cents,
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
});
