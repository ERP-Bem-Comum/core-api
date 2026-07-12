/**
 * BGP-SCENARIO-CHILDREN (issue #401) — lista os planos-filhos (cenários/calibrações) diretos
 * de um plano. Espelha `get-budget-plan.ts` (validar -> fetch -> map). `budget-plan-not-found`
 * distingue "plano inexistente" (404) de "plano sem filhos" (200 + items:[]).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanStatus } from '../../domain/budget-plan/status.ts';
import * as PlanVersion from '../../domain/budget-plan/version.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';

export type BudgetPlanChildView = Readonly<{
  id: string;
  version: string;
  scenarioName: string | null;
  status: BudgetPlanStatus;
  totalInCents: number;
  updatedByRef: string | null;
}>;

export type ListScenarioChildrenResult = Readonly<{
  items: readonly BudgetPlanChildView[];
}>;

export type ListScenarioChildrenError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | BudgetPlanRepositoryError;

export type ListScenarioChildrenDeps = Readonly<{
  planRepo: BudgetPlanRepository;
}>;

const toChildView = (plan: BudgetPlanEntity): BudgetPlanChildView => ({
  id: String(plan.id),
  version: PlanVersion.format(plan.version),
  scenarioName: plan.scenarioName,
  status: plan.status,
  totalInCents: BudgetPlan.total(plan).cents,
  updatedByRef: plan.updatedByRef === null ? null : String(plan.updatedByRef),
});

// Ordena por versão ascendente comparando os inteiros major/minor ANTES de formatar
// (evita comparação lexicográfica de string, que quebraria em major/minor >= 10).
const byVersionAscending = (a: BudgetPlanEntity, b: BudgetPlanEntity): number => {
  const byMajor = a.version.major - b.version.major;
  return byMajor !== 0 ? byMajor : a.version.minor - b.version.minor;
};

export const listScenarioChildren =
  (deps: ListScenarioChildrenDeps) =>
  async (rawId: string): Promise<Result<ListScenarioChildrenResult, ListScenarioChildrenError>> => {
    const id = BudgetPlanId.rehydrate(rawId);
    if (!id.ok) return id;

    const found = await deps.planRepo.findById(id.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');

    const children = await deps.planRepo.listChildren(id.value);
    if (!children.ok) return children;

    return ok({ items: [...children.value].sort(byVersionAscending).map(toChildView) });
  };
