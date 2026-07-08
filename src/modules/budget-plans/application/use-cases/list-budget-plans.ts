import { type Result, ok } from '../../../../shared/primitives/result.ts';
import { ProgramRef, type BudgetPlanRefError } from '../../domain/shared/refs.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanStatus } from '../../domain/budget-plan/status.ts';
import * as PlanVersion from '../../domain/budget-plan/version.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
  ListBudgetPlansQuery,
} from '../../domain/budget-plan/repository.ts';
import type { ProgramCatalogPort, ProgramCatalogError } from '../ports/program-catalog.ts';

export type ListBudgetPlansInput = Readonly<{
  page: number;
  limit: number;
  year?: number;
  status?: BudgetPlanStatus;
  programRef?: string;
}>;

export type BudgetPlanListItem = Readonly<{
  id: string;
  year: number;
  status: BudgetPlanStatus;
  version: string;
  programRef: string;
  programName: string;
  totalInCents: number;
  updatedAt: Date;
}>;

export type ListBudgetPlansError =
  | BudgetPlanRefError
  | ProgramCatalogError
  | BudgetPlanRepositoryError;

export type ListBudgetPlansDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  programCatalog: ProgramCatalogPort;
}>;

export type BudgetPlanListPage = Readonly<{
  items: readonly BudgetPlanListItem[];
  total: number;
}>;

const toItem = (plan: BudgetPlanEntity, programName: string): BudgetPlanListItem => ({
  id: String(plan.id),
  year: plan.year,
  status: plan.status,
  version: PlanVersion.format(plan.version),
  programRef: String(plan.programRef),
  programName,
  totalInCents: BudgetPlan.total(plan).cents,
  updatedAt: plan.updatedAt,
});

export const listBudgetPlans =
  (deps: ListBudgetPlansDeps) =>
  async (
    input: ListBudgetPlansInput,
  ): Promise<Result<BudgetPlanListPage, ListBudgetPlansError>> => {
    let programRefFilter: ListBudgetPlansQuery['programRef'] = undefined;
    if (input.programRef !== undefined) {
      const parsed = ProgramRef.rehydrate(input.programRef);
      if (!parsed.ok) return parsed;
      programRefFilter = parsed.value;
    }

    const query: ListBudgetPlansQuery = {
      page: input.page,
      limit: input.limit,
      ...(input.year !== undefined ? { year: input.year } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(programRefFilter !== undefined ? { programRef: programRefFilter } : {}),
    };

    const page = await deps.planRepo.listPaged(query);
    if (!page.ok) return page;

    // Hidrata o nome do programa uma vez por ref distinta (projeção mínima do catálogo).
    const names = new Map<string, string>();
    const items: BudgetPlanListItem[] = [];
    for (const plan of page.value.items) {
      const key = String(plan.programRef);
      let name = names.get(key);
      if (name === undefined) {
        const program = await deps.programCatalog.getByRef(plan.programRef);
        if (!program.ok) return program;
        name = program.value?.name ?? '';
        names.set(key, name);
      }
      items.push(toItem(plan, name));
    }

    return ok({ items, total: page.value.total });
  };
