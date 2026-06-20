import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { Category } from '../../../domain/category/category.ts';
import type {
  CategoryReadError,
  CategoryReadPort,
} from '../../../application/ports/category-read.ts';

// Read store in-memory (testes/seed): omite inativos, ordena por (group, name). Read-only.
const byGroupThenName = (a: Category, b: Category): number =>
  a.group === b.group ? a.name.localeCompare(b.name) : a.group.localeCompare(b.group);

export const createInMemoryCategoryReadStore = (
  categories: readonly Category[] = [],
): CategoryReadPort => ({
  list: async (): Promise<Result<readonly Category[], CategoryReadError>> =>
    ok(categories.filter((c) => c.active).sort(byGroupThenName)),
});
