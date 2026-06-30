import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { CostCenter, CostCenterError, CreateInput } from './types.ts';

export type { CostCenter, CostCenterError, CreateInput } from './types.ts';

const isBlank = (value: string): boolean => value.trim().length === 0;

export const create = (input: CreateInput): Result<CostCenter, CostCenterError> => {
  if (isBlank(input.code)) return err('cost-center-code-empty');
  if (isBlank(input.name)) return err('cost-center-name-empty');

  return ok(
    immutable<CostCenter>({
      id: input.id,
      code: input.code,
      name: input.name,
      active: input.active ?? true,
    }),
  );
};
