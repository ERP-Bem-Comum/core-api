/**
 * Use case `getPayable` — query read-only que retorna um Título Financeiro pelo ID.
 *
 * Sequência canônica (.claude/rules/application.md):
 *   1. Validar `payableId` via `PayableId.rehydrate` (UUID v4 check).
 *   2. `repo.findById` — guard `not-found` se `null`.
 *   3. Retorna `ok(payable)`.
 *
 * Sem `Clock` em Deps (read-only — sem timestamp).
 *
 * Pattern espelha `src/modules/contracts/application/use-cases/get-contract.ts`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import type { PayableIdError } from '#src/modules/financial/domain/shared/payable-id.ts';
import type { Payable } from '#src/modules/financial/domain/payable/types.ts';
import type {
  PayableRepository,
  PayableRepositoryError,
} from '#src/modules/financial/domain/payable/repository.ts';

export type GetPayableCommand = Readonly<{ payableId: string }>;

export type GetPayableError = PayableIdError | PayableRepositoryError | 'payable-not-found';

type Deps = Readonly<{ payableRepo: PayableRepository }>;

export const getPayable =
  (deps: Deps) =>
  async (cmd: GetPayableCommand): Promise<Result<Payable, GetPayableError>> => {
    const idResult = PayableId.rehydrate(cmd.payableId);
    if (!idResult.ok) return idResult;

    const load = await deps.payableRepo.findById(idResult.value);
    if (!load.ok) return load;
    if (load.value === null) return err('payable-not-found');

    return ok(load.value);
  };
