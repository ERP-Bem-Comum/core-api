import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type CategoryId = Brand<string, 'CategoryId'>;
export type CategoryIdError = 'category-id-invalid';

export const generate = (): CategoryId => newUuid() as CategoryId;

export const rehydrate = (raw: string): Result<CategoryId, CategoryIdError> =>
  isUuidV4(raw) ? ok(raw as CategoryId) : err('category-id-invalid');
