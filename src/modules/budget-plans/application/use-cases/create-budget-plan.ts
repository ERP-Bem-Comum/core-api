import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
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
import {
  clonePlanContent,
  type ClonePlanContentDeps,
  type ClonePlanContentError,
} from './clone-plan-content.ts';

export type CreateBudgetPlanCommand = Readonly<{
  year: number;
  programRef: string;
  // #1092 — "Criar a partir do ano de". Ausente: o plano nasce vazio, como antes.
  importFromYear?: number | undefined;
  updatedByRef: string;
}>;

export type CreateBudgetPlanError =
  | BudgetPlanRefError
  | BudgetPlanError
  | 'program-not-found'
  | 'program-not-active'
  | 'budget-plan-already-exists'
  | ProgramCatalogError
  | BudgetPlanRepositoryError
  | ClonePlanContentError
  | UserRef.UserRefError;

export type CreateBudgetPlanDeps = ClonePlanContentDeps &
  Readonly<{
    planRepo: BudgetPlanRepository;
    programCatalog: ProgramCatalogPort;
    clock: Clock;
  }>;

export type CreateBudgetPlanOutcome = Readonly<{
  plan: BudgetPlanEntity;
  event: BudgetPlanEvent;
  // #1092 — com importação o plano nasce com os lançamentos da origem; sem ela, 0.
  totalInCents: number;
}>;

// Estratégia α (early return): passos dependentes — ref → programa → domínio → duplicidade →
// [origem da importação → cópia] → persist.
export const createBudgetPlan =
  (deps: CreateBudgetPlanDeps) =>
  async (
    cmd: CreateBudgetPlanCommand,
  ): Promise<Result<CreateBudgetPlanOutcome, CreateBudgetPlanError>> => {
    const programRef = ProgramRef.rehydrate(cmd.programRef);
    if (!programRef.ok) return programRef;

    const actor = UserRef.rehydrate(cmd.updatedByRef);
    if (!actor.ok) return actor;

    const program = await deps.programCatalog.getByRef(programRef.value);
    if (!program.ok) return program;
    if (program.value === null) return err('program-not-found');
    if (!program.value.active) return err('program-not-active');

    const now = deps.clock.now();
    const created = BudgetPlan.create({
      id: BudgetPlanId.generate(),
      year: cmd.year,
      programRef: programRef.value,
      now,
      actor: actor.value,
    });
    if (!created.ok) return created;
    const { plan, event } = created.value;

    const existing = await deps.planRepo.findRootByYearAndProgram(cmd.year, programRef.value);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('budget-plan-already-exists');

    if (cmd.importFromYear === undefined) {
      const saved = await deps.planRepo.save(plan, [event]);
      if (!saved.ok) return saved;
      return ok({ plan, event, totalInCents: 0 });
    }

    const candidates = await deps.planRepo.listApprovedByYear({
      year: cmd.importFromYear,
      programRef: programRef.value,
    });
    if (!candidates.ok) return candidates;
    const source = BudgetPlan.selectImportSource(plan, cmd.importFromYear, candidates.value);
    if (!source.ok) return source;

    // O plano novo é independente da origem: raiz (sem parentId), RASCUNHO, v1.0, ids novos em tudo.
    // O BudgetPlanCreated vai no mesmo commit da cópia.
    const cloned = await clonePlanContent(deps)({
      source: source.value,
      target: plan,
      now,
      actor: actor.value,
      events: [event],
    });
    if (!cloned.ok) return cloned;
    return ok({ plan: cloned.value.plan, event, totalInCents: cloned.value.totalInCents });
  };
