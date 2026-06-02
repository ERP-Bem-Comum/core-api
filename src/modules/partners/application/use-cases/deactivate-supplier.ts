/**
 * Use case `deactivateSupplier` — Active → Inactive (soft-delete).
 * rehydrate id → `findById` (not-found) → `Supplier.deactivate(now)` → `save`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import type { InactiveSupplier } from '#src/modules/partners/domain/supplier/types.ts';
import type { SupplierEvent } from '#src/modules/partners/domain/supplier/events.ts';
import type { SupplierError } from '#src/modules/partners/domain/supplier/errors.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';

export type DeactivateSupplierCommand = Readonly<{ supplierId: string }>;

export type DeactivateSupplierError =
  | 'deactivate-supplier-invalid-id'
  | 'deactivate-supplier-not-found'
  | SupplierError
  | SupplierRepositoryError;

export type DeactivateSupplierOutput = Readonly<{
  supplier: InactiveSupplier;
  event: SupplierEvent;
}>;

type Deps = Readonly<{ supplierRepo: SupplierRepository; clock: Clock }>;

export const deactivateSupplier =
  (deps: Deps) =>
  async (
    cmd: DeactivateSupplierCommand,
  ): Promise<Result<DeactivateSupplierOutput, DeactivateSupplierError>> => {
    const id = SupplierId.rehydrate(cmd.supplierId);
    if (!id.ok) return err('deactivate-supplier-invalid-id');

    const fetched = await deps.supplierRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('deactivate-supplier-not-found');

    const transition = Supplier.deactivate(fetched.value, deps.clock.now());
    if (!transition.ok) return transition;

    const saved = await deps.supplierRepo.save(transition.value.supplier);
    if (!saved.ok) return saved;

    return ok({ supplier: transition.value.supplier, event: transition.value.event });
  };
