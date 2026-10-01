/**
 * Use case `registerSupplier` — cria um fornecedor (nasce Active).
 *
 * Sequência: `Supplier.register` (valida campos texto, email, documento CPF/CNPJ com a
 * identidade PF × PJ, serviceCategory e a invariante de payment target) → guard de
 * documento duplicado via `findByDocument` →
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
} from '#src/modules/partners/domain/shared/payment-target.ts';
import type { SupplierEvent } from '#src/modules/partners/domain/supplier/events.ts';
import type { SupplierError } from '#src/modules/partners/domain/supplier/errors.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';

export type RegisterSupplierCommand = Readonly<{
  name: string;
  email: string;
  document: string;
  corporateName: string | null;
  fantasyName: string | null;
  serviceCategory: string;
  bankAccount: BankAccountInput | null;
  pixKey: PixKeyInput | null;
  serviceRating?: string | null;
  ratingComment?: string | null;
}>;

export type RegisterSupplierError =
  | 'register-supplier-document-duplicate'
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
      document: cmd.document,
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

    const existing = await deps.supplierRepo.findByDocument(
      registered.value.supplier.identity.document,
    );
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('register-supplier-document-duplicate');

    const saved = await deps.supplierRepo.save(registered.value.supplier, [registered.value.event]);
    if (!saved.ok) return saved;

    return ok({ supplier: registered.value.supplier, event: registered.value.event });
  };
