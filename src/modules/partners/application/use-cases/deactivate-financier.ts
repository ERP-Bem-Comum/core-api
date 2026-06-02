/**
 * Use case `deactivateFinancier` — Active → Inactive (soft-delete).
 * rehydrate id → `findById` (not-found) → `Financier.deactivate(now)` → `save`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import type { InactiveFinancier } from '#src/modules/partners/domain/financier/types.ts';
import type { FinancierEvent } from '#src/modules/partners/domain/financier/events.ts';
import type { FinancierError } from '#src/modules/partners/domain/financier/errors.ts';
import type {
  FinancierRepository,
  FinancierRepositoryError,
} from '#src/modules/partners/domain/financier/repository.ts';

export type DeactivateFinancierCommand = Readonly<{ financierId: string }>;

export type DeactivateFinancierError =
  | 'deactivate-financier-invalid-id'
  | 'deactivate-financier-not-found'
  | FinancierError
  | FinancierRepositoryError;

export type DeactivateFinancierOutput = Readonly<{
  financier: InactiveFinancier;
  event: FinancierEvent;
}>;

type Deps = Readonly<{ financierRepo: FinancierRepository; clock: Clock }>;

export const deactivateFinancier =
  (deps: Deps) =>
  async (
    cmd: DeactivateFinancierCommand,
  ): Promise<Result<DeactivateFinancierOutput, DeactivateFinancierError>> => {
    const id = FinancierId.rehydrate(cmd.financierId);
    if (!id.ok) return err('deactivate-financier-invalid-id');

    const fetched = await deps.financierRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('deactivate-financier-not-found');

    const transition = Financier.deactivate(fetched.value, deps.clock.now());
    if (!transition.ok) return transition;

    const saved = await deps.financierRepo.save(transition.value.financier);
    if (!saved.ok) return saved;

    return ok({ financier: transition.value.financier, event: transition.value.event });
  };
