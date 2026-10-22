import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import type { BudgetPlan as BudgetPlanEntity, Budget } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanStatus } from '../../domain/budget-plan/status.ts';
import * as PlanVersion from '../../domain/budget-plan/version.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import type {
  BudgetResultRepository,
  BudgetResultSumError,
} from '../../domain/budget-result/repository.ts';
import type { ProgramCatalogPort, ProgramCatalogError } from '../ports/program-catalog.ts';
import { planTotal, type PlanTotalError } from '../read-models/plan-total.ts';

export type BudgetDetailItem = Readonly<{
  id: string;
  partner: Readonly<{ kind: 'state' | 'municipality'; ref: string }>;
  valueInCents: number;
}>;

export type BudgetPlanDetail = Readonly<{
  id: string;
  year: number;
  status: BudgetPlanStatus;
  version: string;
  programRef: string;
  programName: string;
  budgets: readonly BudgetDetailItem[];
  totalInCents: number;
  createdAt: Date;
  updatedAt: Date;
  updatedByRef: string | null;
}>;

export type GetBudgetPlanError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | ProgramCatalogError
  | BudgetPlanRepositoryError
  | BudgetResultSumError
  | PlanTotalError;

export type GetBudgetPlanDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  budgetResultRepo: BudgetResultRepository;
  programCatalog: ProgramCatalogPort;
}>;

const toBudgetItem = (
  budget: Budget,
  sums: ReadonlyMap<string, Money.Money>,
): BudgetDetailItem => ({
  id: String(budget.id),
  partner: { kind: budget.partner.kind, ref: String(budget.partner.ref) },
  valueInCents: (sums.get(String(budget.id)) ?? Money.ZERO).cents,
});

const toDetail = (
  plan: BudgetPlanEntity,
  programName: string,
  sums: ReadonlyMap<string, Money.Money>,
  total: Money.Money,
): BudgetPlanDetail => ({
  id: String(plan.id),
  year: plan.year,
  status: plan.status,
  version: PlanVersion.format(plan.version),
  programRef: String(plan.programRef),
  programName,
  budgets: plan.budgets.map((b) => toBudgetItem(b, sums)),
  totalInCents: total.cents,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
  updatedByRef: plan.updatedByRef === null ? null : String(plan.updatedByRef),
});

export const getBudgetPlan =
  (deps: GetBudgetPlanDeps) =>
  async (rawId: string): Promise<Result<BudgetPlanDetail, GetBudgetPlanError>> => {
    const id = BudgetPlanId.rehydrate(rawId);
    if (!id.ok) return id;

    const found = await deps.planRepo.findById(id.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');

    const program = await deps.programCatalog.getByRef(found.value.programRef);
    if (!program.ok) return program;

    const sums = await deps.budgetResultRepo.sumByBudgetIds(found.value.budgets.map((b) => b.id));
    if (!sums.ok) return sums;

    const total = planTotal(found.value, sums.value);
    if (!total.ok) return total;

    return ok(toDetail(found.value, program.value?.name ?? '', sums.value, total.value));
  };
