/**
 * Use case `registerSupplier` — cria um fornecedor (nasce Active).
 *
 * Sequência: `Supplier.register` (valida campos texto, email, CNPJ, serviceCategory
 * e a invariante de payment target) → guard de CNPJ duplicado via `findByCnpj` →
 * `save`. Tempo injetado via `Clock`. Curried `(deps) => (cmd)` (padrão `approvePayable`).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import type { ActiveSupplier } from '#src/modules/partners/domain/supplier/types.ts';
import type {
  BankAccountInput,
  PixKeyInput,
} from '#src/modules/partners/domain/supplier/payment-target.ts';
import type { SupplierEvent } from '#src/modules/partners/domain/supplier/events.ts';
import type { SupplierError } from '#src/modules/partners/domain/supplier/errors.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';

export type RegisterSupplierCommand = Readonly<{
  name: string;
  email: string;
  cnpj: string;
  corporateName: string;
  fantasyName: string;
  serviceCategory: string;
  bankAccount: BankAccountInput | null;
  pixKey: PixKeyInput | null;
  serviceRating?: string | null;
  ratingComment?: string | null;
}>;

export type RegisterSupplierError =
  | 'register-supplier-cnpj-duplicate'
  | SupplierError
  | SupplierRepositoryError;

export type RegisterSupplierOutput = Readonly<{
  supplier: ActiveSupplier;
  event: SupplierEvent;
}>;

type Deps = Readonly<{ supplierRepo: SupplierRepository; clock: Clock }>;

export const registerSupplier =
  (deps: Deps) =>
  async (
    cmd: RegisterSupplierCommand,
  ): Promise<Result<RegisterSupplierOutput, RegisterSupplierError>> => {
    const registered = Supplier.register({
      id: SupplierId.generate(),
      name: cmd.name,
      email: cmd.email,
      cnpj: cmd.cnpj,
      corporateName: cmd.corporateName,
      fantasyName: cmd.fantasyName,
      serviceCategory: cmd.serviceCategory,
      bankAccount: cmd.bankAccount,
      pixKey: cmd.pixKey,
      serviceRating: cmd.serviceRating ?? null,
      ratingComment: cmd.ratingComment ?? null,
      registeredAt: deps.clock.now(),
    });
    if (!registered.ok) return registered;

    const existing = await deps.supplierRepo.findByCnpj(registered.value.supplier.cnpj);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('register-supplier-cnpj-duplicate');

    const saved = await deps.supplierRepo.save(registered.value.supplier, [registered.value.event]);
    if (!saved.ok) return saved;

    return ok({ supplier: registered.value.supplier, event: registered.value.event });
  };
