/**
 * Use case `editSupplier` — edição cadastral (PUT total) com RBAC do campo vital (CNPJ).
 * Espelha `editFinancier`. Regra do vital no use case (usa o writer; evita inconsistência
 * reader/writer do driver memory). Payment-target é não-vital (editável via supplier:write).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import type { Supplier as SupplierAggregate } from '#src/modules/partners/domain/supplier/types.ts';
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

export type EditSupplierCommand = Readonly<{
  supplierId: string;
  canEditSensitive: boolean;
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

export type EditSupplierError =
  | 'edit-supplier-invalid-id'
  | 'edit-supplier-not-found'
  | 'edit-supplier-cnpj-duplicate'
  | 'edit-supplier-sensitive-forbidden'
  | SupplierError
  | SupplierRepositoryError;

export type EditSupplierOutput = Readonly<{
  supplier: SupplierAggregate;
  event: SupplierEvent;
}>;

type Deps = Readonly<{ supplierRepo: SupplierRepository; clock: Clock }>;

export const editSupplier =
  (deps: Deps) =>
  async (cmd: EditSupplierCommand): Promise<Result<EditSupplierOutput, EditSupplierError>> => {
    const id = SupplierId.rehydrate(cmd.supplierId);
    if (!id.ok) return err('edit-supplier-invalid-id');

    const fetched = await deps.supplierRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('edit-supplier-not-found');
    const current = fetched.value;

    const edited = Supplier.edit(
      current,
      {
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
      },
      deps.clock.now(),
    );
    if (!edited.ok) return edited;

    const cnpjChanged = String(current.cnpj) !== String(edited.value.supplier.cnpj);
    if (cnpjChanged) {
      if (!cmd.canEditSensitive) return err('edit-supplier-sensitive-forbidden');
      const byCnpj = await deps.supplierRepo.findByCnpj(edited.value.supplier.cnpj);
      if (!byCnpj.ok) return byCnpj;
      if (byCnpj.value !== null && String(byCnpj.value.id) !== String(id.value)) {
        return err('edit-supplier-cnpj-duplicate');
      }
    }

    const saved = await deps.supplierRepo.save(edited.value.supplier, [edited.value.event]);
    if (!saved.ok) return saved;

    return ok({ supplier: edited.value.supplier, event: edited.value.event });
  };
