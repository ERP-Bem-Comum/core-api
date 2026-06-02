/**
 * Query `findSupplierByCnpj` — busca single por CNPJ. Valida o CNPJ na borda
 * (`Cnpj.parse`); `null` é o "não encontrado" canônico (não-erro).
 */

import type { Result } from '#src/shared/index.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import type { CnpjError } from '#src/shared/kernel/cnpj.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';

export type FindSupplierByCnpjCommand = Readonly<{ cnpj: string }>;

export type FindSupplierByCnpjError = CnpjError | SupplierRepositoryError;

type Deps = Readonly<{ supplierRepo: SupplierRepository }>;

export const findSupplierByCnpj =
  (deps: Deps) =>
  async (
    cmd: FindSupplierByCnpjCommand,
  ): Promise<Result<Supplier | null, FindSupplierByCnpjError>> => {
    const cnpj = Cnpj.parse(cmd.cnpj);
    if (!cnpj.ok) return cnpj;
    return deps.supplierRepo.findByCnpj(cnpj.value);
  };
