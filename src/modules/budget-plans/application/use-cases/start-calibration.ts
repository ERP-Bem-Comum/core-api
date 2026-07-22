import { type Result, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import { BudgetPlan } from '../../domain/budget-plan/budget-plan.ts';
import type { BudgetPlanError } from '../../domain/budget-plan/errors.ts';
import {
  clonePlanContent,
  type ClonePlanContentDeps,
  type ClonePlanContentError,
  type ClonePlanContentOutcome,
} from './clone-plan-content.ts';

export type StartCalibrationCommand = Readonly<{
  parentPlanId: string;
  updatedByRef: string;
}>;

export type StartCalibrationError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | BudgetPlanError
  | ClonePlanContentError
  | UserRef.UserRefError;

export type StartCalibrationDeps = ClonePlanContentDeps & Readonly<{ clock: Clock }>;

// US4/CA1 — deriva uma calibração (filho EM_CALIBRACAO) de um plano APROVADO e clona o conteúdo inteiro.
export const startCalibration =
  (deps: StartCalibrationDeps) =>
  async (
    cmd: StartCalibrationCommand,
  ): Promise<Result<ClonePlanContentOutcome, StartCalibrationError>> => {
    const parentId = BudgetPlanId.rehydrate(cmd.parentPlanId);
    if (!parentId.ok) return parentId;

    const actor = UserRef.rehydrate(cmd.updatedByRef);
    if (!actor.ok) return actor;

    const found = await deps.planRepo.findById(parentId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');

    const children = await deps.planRepo.listChildren(parentId.value);
    if (!children.ok) return children;

    const now = deps.clock.now();
    const derived = BudgetPlan.startCalibration(
      found.value,
      children.value,
      BudgetPlanId.generate(),
      { now, actor: actor.value },
    );
    if (!derived.ok) return derived;

    return clonePlanContent(deps)(found.value, derived.value.plan, now, actor.value);
  };
