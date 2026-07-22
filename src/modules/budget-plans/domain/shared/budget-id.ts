import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrao D (module-as-namespace): consumir com `import * as BudgetId from './budget-id.ts'`.

export type BudgetId = Brand<string, 'BudgetId'>;
export type BudgetIdError = 'budget-id-invalid';

export const generate = (): BudgetId => newUuid() as BudgetId;

export const rehydrate = (raw: string): Result<BudgetId, BudgetIdError> =>
  isUuidV4(raw) ? ok(raw as BudgetId) : err('budget-id-invalid');
