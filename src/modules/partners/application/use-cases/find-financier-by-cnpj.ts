/**
 * Query `findFinancierByCnpj` — busca single por CNPJ. Valida o CNPJ na borda
 * (`Cnpj.parse`); `null` é o "não encontrado" canônico (não-erro).
 */

import type { Result } from '#src/shared/index.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import type { CnpjError } from '#src/shared/kernel/cnpj.ts';
import type { Financier } from '#src/modules/partners/domain/financier/types.ts';
import type {
  FinancierRepository,
  FinancierRepositoryError,
} from '#src/modules/partners/domain/financier/repository.ts';

export type FindFinancierByCnpjCommand = Readonly<{ cnpj: string }>;

export type FindFinancierByCnpjError = CnpjError | FinancierRepositoryError;

type Deps = Readonly<{ financierRepo: FinancierRepository }>;

export const findFinancierByCnpj =
  (deps: Deps) =>
  async (
    cmd: FindFinancierByCnpjCommand,
  ): Promise<Result<Financier | null, FindFinancierByCnpjError>> => {
    const cnpj = Cnpj.parse(cmd.cnpj);
    if (!cnpj.ok) return cnpj;
    return deps.financierRepo.findByCnpj(cnpj.value);
  };
