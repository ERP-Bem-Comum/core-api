import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import { ProgramRef, type BudgetPlanRefError } from '../../domain/shared/refs.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '../../domain/budget-plan/types.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import type { BudgetPlanEvent } from '../../domain/budget-plan/events.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import type { ProgramCatalogPort, ProgramCatalogError } from '../ports/program-catalog.ts';

export type CreateBudgetPlanCommand = Readonly<{
  year: number;
  programRef: string;
}>;

export type CreateBudgetPlanError =
  | BudgetPlanRefError
  | BudgetPlanError
  | 'program-not-found'
  | 'program-not-active'
  | 'budget-plan-already-exists'
  | ProgramCatalogError
  | BudgetPlanRepositoryError;

export type CreateBudgetPlanDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  programCatalog: ProgramCatalogPort;
  clock: Clock;
}>;

export type CreateBudgetPlanOutcome = Readonly<{
  plan: BudgetPlanEntity;
  event: BudgetPlanEvent;
}>;

// Estratégia α (early return): passos dependentes — ref → programa → domínio → duplicidade → persist.
export const createBudgetPlan =
  (deps: CreateBudgetPlanDeps) =>
  async (
    cmd: CreateBudgetPlanCommand,
  ): Promise<Result<CreateBudgetPlanOutcome, CreateBudgetPlanError>> => {
    const programRef = ProgramRef.rehydrate(cmd.programRef);
    if (!programRef.ok) return programRef;

    const program = await deps.programCatalog.getByRef(programRef.value);
    if (!program.ok) return program;
    if (program.value === null) return err('program-not-found');
    if (!program.value.active) return err('program-not-active');

    const created = BudgetPlan.create({
      id: BudgetPlanId.generate(),
      year: cmd.year,
      programRef: programRef.value,
      now: deps.clock.now(),
    });
    if (!created.ok) return created;

    const existing = await deps.planRepo.findRootByYearAndProgram(cmd.year, programRef.value);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('budget-plan-already-exists');

    const saved = await deps.planRepo.save(created.value.plan, [created.value.event]);
    if (!saved.ok) return saved;

    return ok(created.value);
  };
