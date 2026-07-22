import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type BudgetResultId = Brand<string, 'BudgetResultId'>;
export type BudgetResultIdError = 'budget-result-id-invalid';

export const generate = (): BudgetResultId => newUuid() as BudgetResultId;

export const rehydrate = (raw: string): Result<BudgetResultId, BudgetResultIdError> =>
  isUuidV4(raw) ? ok(raw as BudgetResultId) : err('budget-result-id-invalid');
