import { type Result, ok } from '../../../../shared/primitives/result.ts';
import { ProgramRef, type BudgetPlanRefError } from '../../domain/shared/refs.ts';
import type { BudgetPlan as BudgetPlanEntity, Budget } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanStatus } from '../../domain/budget-plan/status.ts';
import * as PlanVersion from '../../domain/budget-plan/version.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
  ListBudgetPlansQuery,
} from '../../domain/budget-plan/repository.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';
import type { ProgramCatalogPort, ProgramCatalogError } from '../ports/program-catalog.ts';
import { planTotalCents, budgetIdsOf } from '../read-models/plan-total.ts';

export type ListBudgetPlansInput = Readonly<{
  page: number;
  limit: number;
  year?: number;
  status?: BudgetPlanStatus;
  programRef?: string;
  rootsOnly?: boolean;
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
  updatedByRef: string | null;
  partnersCount: number;
  networkKind: 'state' | 'municipality' | 'mixed' | null;
  parentId: string | null;
  scenarioName: string | null;
}>;

export type ListBudgetPlansError =
  | BudgetPlanRefError
  | ProgramCatalogError
  | BudgetPlanRepositoryError
  | BudgetResultRepositoryError;

export type ListBudgetPlansDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  budgetResultRepo: BudgetResultRepository;
  programCatalog: ProgramCatalogPort;
}>;

export type BudgetPlanListPage = Readonly<{
  items: readonly BudgetPlanListItem[];
  total: number;
}>;

/**
 * Deriva o tipo de Rede do plano a partir dos `kind` distintos em `budgets[].partner`
 * (projeção de apresentação — não é regra de domínio): sem budgets -> null; 1 kind único ->
 * esse kind; 2 kinds (state + municipality) -> 'mixed'.
 */
const deriveNetworkKind = (
  budgets: readonly Budget[],
): 'state' | 'municipality' | 'mixed' | null => {
  const kinds = new Set(budgets.map((budget) => budget.partner.kind));
  if (kinds.size === 0) return null;
  if (kinds.size > 1) return 'mixed';
  return [...kinds][0] ?? null;
};

const toItem = (
  plan: BudgetPlanEntity,
  programName: string,
  sums: ReadonlyMap<string, number>,
): BudgetPlanListItem => ({
  id: String(plan.id),
  year: plan.year,
  status: plan.status,
  version: PlanVersion.format(plan.version),
  programRef: String(plan.programRef),
  programName,
  totalInCents: planTotalCents(plan, sums),
  updatedAt: plan.updatedAt,
  updatedByRef: plan.updatedByRef === null ? null : String(plan.updatedByRef),
  partnersCount: plan.budgets.length,
  networkKind: deriveNetworkKind(plan.budgets),
  parentId: plan.parentId === null ? null : String(plan.parentId),
  scenarioName: plan.scenarioName,
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
      ...(input.rootsOnly !== undefined ? { rootsOnly: input.rootsOnly } : {}),
    };

    const page = await deps.planRepo.listPaged(query);
    if (!page.ok) return page;

    // #458 — UMA agregação de somas para a página inteira (evita N+1: sem sumByBudgetIds por plano).
    const sums = await deps.budgetResultRepo.sumByBudgetIds(budgetIdsOf(page.value.items));
    if (!sums.ok) return sums;

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
      items.push(toItem(plan, name, sums.value));
    }

    return ok({ items, total: page.value.total });
  };
