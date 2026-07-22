import { type Result, ok } from '../../../../shared/primitives/result.ts';
import { selectCurrentApprovedByFamily } from '../../domain/budget-plan/current-approved.ts';
import { ProgramRef } from '../../domain/shared/refs.ts';
import type { BudgetPlanRefError } from '../../domain/shared/refs.ts';
import type { BudgetPlanRepositoryError } from '../../domain/budget-plan/repository.ts';
import {
  loadPlanExportSection,
  type PlanExportDeps,
  type PlanExportSection,
  type PlanExportLoadError,
} from './get-plan-export.ts';

export type GetConsolidatedExportQuery = Readonly<{ year: number; programRef?: string }>;

export type GetConsolidatedExportError =
  | BudgetPlanRefError
  | BudgetPlanRepositoryError
  | PlanExportLoadError;

// CA2 — seções de export de TODAS as raízes aprovadas do ano (opcionalmente de um programa). O
// adapter HTTP concatena as linhas de CSV; consolidado = concatenação, sem linha de total.
export const getConsolidatedExport =
  (deps: PlanExportDeps) =>
  async (
    query: GetConsolidatedExportQuery,
  ): Promise<Result<readonly PlanExportSection[], GetConsolidatedExportError>> => {
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

    const sections: PlanExportSection[] = [];
    for (const plan of current) {
      const section = await loadPlanExportSection(deps, plan);
      if (!section.ok) return section;
      sections.push(section.value);
    }
    return ok(sections);
  };
