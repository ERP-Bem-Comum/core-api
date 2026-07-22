import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type SubcategoryId = Brand<string, 'SubcategoryId'>;
export type SubcategoryIdError = 'subcategory-id-invalid';

export const generate = (): SubcategoryId => newUuid() as SubcategoryId;

export const rehydrate = (raw: string): Result<SubcategoryId, SubcategoryIdError> =>
  isUuidV4(raw) ? ok(raw as SubcategoryId) : err('subcategory-id-invalid');
