import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import * as CategoryGroup from './category-group.ts';
import type { Category, CategoryError, CreateInput } from './types.ts';

export type { Category, CategoryError, CreateInput } from './types.ts';
export type { CategoryGroup } from './category-group.ts';

const isBlank = (value: string): boolean => value.trim().length === 0;

export const create = (input: CreateInput): Result<Category, CategoryError> => {
  if (isBlank(input.name)) return err('category-name-empty');

  const groupR = CategoryGroup.rehydrate(input.group);
  if (!groupR.ok) return err('category-group-invalid');

  return ok(
    immutable<Category>({
      id: input.id,
      name: input.name,
      group: groupR.value,
      active: input.active ?? true,
      parentId: input.parentId ?? null,
      costCenterId: input.costCenterId ?? null,
    }),
  );
};
