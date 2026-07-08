import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { ProgramRef } from '../shared/refs.ts';
import type { BudgetPlan } from './types.ts';
import type { BudgetPlanStatus } from './status.ts';
import type { BudgetPlansModuleEvent } from '../../public-api/events.ts';
import type { OutboxAppendError } from '../../application/ports/outbox.ts';

export type BudgetPlanRepositoryError = 'budget-plan-repo-unavailable' | OutboxAppendError;

export type ListBudgetPlansQuery = Readonly<{
  page: number; // 1-based (validado na borda)
  limit: number; // teto aplicado na borda
  year?: number;
  status?: BudgetPlanStatus;
  programRef?: ProgramRef;
}>;

export type BudgetPlanPage = Readonly<{
  items: readonly BudgetPlan[];
  total: number;
}>;

export type BudgetPlanRepository = Readonly<{
  findById: (id: BudgetPlanId) => Promise<Result<BudgetPlan | null, BudgetPlanRepositoryError>>;
  // Unicidade do plano RAIZ por (year, programRef) — invariante portada do legado.
  // Cenários/calibrações (filhos, Fatia 4) não entram nesta consulta.
  findRootByYearAndProgram: (
    year: number,
    programRef: ProgramRef,
  ) => Promise<Result<BudgetPlan | null, BudgetPlanRepositoryError>>;
  listPaged: (
    query: ListBudgetPlansQuery,
  ) => Promise<Result<BudgetPlanPage, BudgetPlanRepositoryError>>;
  // Anos distintos com plano existente (alimenta o options).
  listYears: () => Promise<Result<readonly number[], BudgetPlanRepositoryError>>;
  save: (
    plan: BudgetPlan,
    events: readonly BudgetPlansModuleEvent[],
  ) => Promise<Result<void, BudgetPlanRepositoryError>>;
}>;
