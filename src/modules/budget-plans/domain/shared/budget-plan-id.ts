import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrao D (module-as-namespace): consumir com `import * as BudgetPlanId from './budget-plan-id.ts'`.
// Formato UUID v4 — compatível com o BudgetPlanRef rehydrate-only do financial (refs.ts).

export type BudgetPlanId = Brand<string, 'BudgetPlanId'>;
export type BudgetPlanIdError = 'budget-plan-id-invalid';

export const generate = (): BudgetPlanId => newUuid() as BudgetPlanId;

export const rehydrate = (raw: string): Result<BudgetPlanId, BudgetPlanIdError> =>
  isUuidV4(raw) ? ok(raw as BudgetPlanId) : err('budget-plan-id-invalid');
