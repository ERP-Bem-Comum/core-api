/**
 * Query `listFinanciers` — lista todos os financiadores. MVP sem paginação (YAGNI).
 */

import type { Result } from '#src/shared/index.ts';
import type { Financier } from '#src/modules/partners/domain/financier/types.ts';
import type {
  FinancierRepository,
  FinancierRepositoryError,
} from '#src/modules/partners/domain/financier/repository.ts';

type Deps = Readonly<{ financierRepo: FinancierRepository }>;

export const listFinanciers =
  (deps: Deps) => async (): Promise<Result<readonly Financier[], FinancierRepositoryError>> =>
    deps.financierRepo.list();
