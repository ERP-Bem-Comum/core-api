/**
 * Query `listSuppliers` — lista todos os fornecedores. MVP sem paginação (YAGNI).
 */

import type { Result } from '#src/shared/index.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';

type Deps = Readonly<{ supplierRepo: SupplierRepository }>;

export const listSuppliers =
  (deps: Deps) => async (): Promise<Result<readonly Supplier[], SupplierRepositoryError>> =>
    deps.supplierRepo.list();
