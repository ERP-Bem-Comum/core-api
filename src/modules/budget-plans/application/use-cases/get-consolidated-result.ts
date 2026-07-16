import { type Result, ok } from '../../../../shared/primitives/result.ts';
import { selectCurrentApprovedByFamily } from '../../domain/budget-plan/current-approved.ts';
import { ProgramRef } from '../../domain/shared/refs.ts';
import type { BudgetPlanRefError } from '../../domain/shared/refs.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';
import type { ProgramCatalogPort, ProgramCatalogError } from '../ports/program-catalog.ts';
import { planTotalCents, budgetIdsOf } from '../read-models/plan-total.ts';

// CA1 — Consolidado ABC (JSON): agrega as raízes aprovadas por Ano × Programa, em centavos. Resumo
// (total + por-plano); o detalhe (breakdown por centro de custo) vive no CSV. `totalCents` = Σ dos
// totais dos planos (Σ orçamentos), espelhando o `data.totalInCents` do legado.
export type ConsolidatedPlanSummary = Readonly<{
  id: string;
  programName: string;
  programAbbreviation: string;
  version: number;
  totalCents: number;
}>;

export type ConsolidatedResult = Readonly<{
  year: number;
  totalCents: number;
  plans: readonly ConsolidatedPlanSummary[];
}>;

export type GetConsolidatedResultQuery = Readonly<{ year: number; programRef?: string }>;

export type GetConsolidatedResultError =
  | BudgetPlanRefError
  | BudgetPlanRepositoryError
  | BudgetResultRepositoryError
  | ProgramCatalogError;

export type GetConsolidatedResultDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  budgetResultRepo: BudgetResultRepository;
  programCatalog: ProgramCatalogPort;
}>;

export const getConsolidatedResult =
  (deps: GetConsolidatedResultDeps) =>
  async (
    query: GetConsolidatedResultQuery,
  ): Promise<Result<ConsolidatedResult, GetConsolidatedResultError>> => {
    let programRef: ProgramRef | undefined = undefined;
    if (query.programRef !== undefined) {
      const parsed = ProgramRef.rehydrate(query.programRef);
      if (!parsed.ok) return parsed;
      programRef = parsed.value;
    }

    const approved = await deps.planRepo.listApprovedByYear({
      year: query.year,
      ...(programRef !== undefined ? { programRef } : {}),
    });
    if (!approved.ok) return approved;
    const current = selectCurrentApprovedByFamily(approved.value);

    // #458 — mesma fonte do detalhe (CA4): uma agregação de somas para todos os planos aprovados.
    const sums = await deps.budgetResultRepo.sumByBudgetIds(budgetIdsOf(current));
    if (!sums.ok) return sums;

    const plans: ConsolidatedPlanSummary[] = [];
    let totalCents = 0;
    for (const plan of current) {
      const program = await deps.programCatalog.getByRef(plan.programRef);
      if (!program.ok) return program;
      const planCents = planTotalCents(plan, sums.value);
      totalCents += planCents;
      plans.push({
        id: String(plan.id),
        programName: program.value?.name ?? String(plan.programRef),
        programAbbreviation: program.value?.abbreviation ?? String(plan.programRef),
        version: plan.version.major,
        totalCents: planCents,
      });
    }

    return ok({ year: query.year, totalCents, plans });
  };
