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
  rootsOnly?: boolean; // quando true, só planos raiz (parent_id IS NULL) — cenários fora
}>;

export type BudgetPlanPage = Readonly<{
  items: readonly BudgetPlan[];
  total: number;
}>;

// Consolidado ABC (US5): TODOS os planos APROVADOS de um ano, opcionalmente de um programa — raiz E
// calibrações/cenários aprovados. A vigência por família (year × programRef) é resolvida a jusante
// por `selectCurrentApprovedByFamily` (a versão aprovada mais recente vence). ORDER BY id.
export type ListApprovedByYearQuery = Readonly<{
  year: number;
  programRef?: ProgramRef;
}>;

export type BudgetPlanRepository = Readonly<{
  findById: (id: BudgetPlanId) => Promise<Result<BudgetPlan | null, BudgetPlanRepositoryError>>;
  // Filhos diretos (calibrações/cenários) de um plano — base da alocação de versão + guards de
  // cardinalidade (US4). Vazio se o plano não tem filhos.
  listChildren: (
    parentId: BudgetPlanId,
  ) => Promise<Result<readonly BudgetPlan[], BudgetPlanRepositoryError>>;
  // Unicidade do plano RAIZ por (year, programRef) — invariante portada do legado.
  // Cenários/calibrações (filhos, Fatia 4) não entram nesta consulta.
  findRootByYearAndProgram: (
    year: number,
    programRef: ProgramRef,
  ) => Promise<Result<BudgetPlan | null, BudgetPlanRepositoryError>>;
  listPaged: (
    query: ListBudgetPlansQuery,
  ) => Promise<Result<BudgetPlanPage, BudgetPlanRepositoryError>>;
  // Planos aprovados de um ano [, programa] — base do Consolidado ABC (US5); vigência resolvida a jusante.
  listApprovedByYear: (
    query: ListApprovedByYearQuery,
  ) => Promise<Result<readonly BudgetPlan[], BudgetPlanRepositoryError>>;
  // Anos distintos com plano existente (alimenta o options).
  listYears: () => Promise<Result<readonly number[], BudgetPlanRepositoryError>>;
  save: (
    plan: BudgetPlan,
    events: readonly BudgetPlansModuleEvent[],
  ) => Promise<Result<void, BudgetPlanRepositoryError>>;
}>;
