/**
 * Use case `reactivateSupplier` — Inactive → Active.
 * rehydrate id → `findById` (not-found) → `Supplier.reactivate(now)` → `save`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import type { ActiveSupplier } from '#src/modules/partners/domain/supplier/types.ts';
import type { SupplierEvent } from '#src/modules/partners/domain/supplier/events.ts';
import type { SupplierError } from '#src/modules/partners/domain/supplier/errors.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';

export type ReactivateSupplierCommand = Readonly<{ supplierId: string }>;

export type ReactivateSupplierError =
  | 'reactivate-supplier-invalid-id'
  | 'reactivate-supplier-not-found'
  | SupplierError
  | SupplierRepositoryError;

export type ReactivateSupplierOutput = Readonly<{
  supplier: ActiveSupplier;
  event: SupplierEvent;
}>;

type Deps = Readonly<{ supplierRepo: SupplierRepository; clock: Clock }>;

export const reactivateSupplier =
  (deps: Deps) =>
  async (
    cmd: ReactivateSupplierCommand,
  ): Promise<Result<ReactivateSupplierOutput, ReactivateSupplierError>> => {
    const id = SupplierId.rehydrate(cmd.supplierId);
    if (!id.ok) return err('reactivate-supplier-invalid-id');

    const fetched = await deps.supplierRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('reactivate-supplier-not-found');

    const transition = Supplier.reactivate(fetched.value, deps.clock.now());
    if (!transition.ok) return transition;

    const saved = await deps.supplierRepo.save(transition.value.supplier);
    if (!saved.ok) return saved;

    return ok({ supplier: transition.value.supplier, event: transition.value.event });
  };
