/**
 * Use case `reactivateFinancier` — Inactive → Active.
 * rehydrate id → `findById` (not-found) → `Financier.reactivate(now)` → `save`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import type { ActiveFinancier } from '#src/modules/partners/domain/financier/types.ts';
import type { FinancierEvent } from '#src/modules/partners/domain/financier/events.ts';
import type { FinancierError } from '#src/modules/partners/domain/financier/errors.ts';
import type {
  FinancierRepository,
  FinancierRepositoryError,
} from '#src/modules/partners/domain/financier/repository.ts';

export type ReactivateFinancierCommand = Readonly<{ financierId: string }>;

export type ReactivateFinancierError =
  | 'reactivate-financier-invalid-id'
  | 'reactivate-financier-not-found'
  | FinancierError
  | FinancierRepositoryError;

export type ReactivateFinancierOutput = Readonly<{
  financier: ActiveFinancier;
  event: FinancierEvent;
}>;

type Deps = Readonly<{ financierRepo: FinancierRepository; clock: Clock }>;

export const reactivateFinancier =
  (deps: Deps) =>
  async (
    cmd: ReactivateFinancierCommand,
  ): Promise<Result<ReactivateFinancierOutput, ReactivateFinancierError>> => {
    const id = FinancierId.rehydrate(cmd.financierId);
    if (!id.ok) return err('reactivate-financier-invalid-id');

    const fetched = await deps.financierRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('reactivate-financier-not-found');

    const transition = Financier.reactivate(fetched.value, deps.clock.now());
    if (!transition.ok) return transition;

    const saved = await deps.financierRepo.save(transition.value.financier);
    if (!saved.ok) return saved;

    return ok({ financier: transition.value.financier, event: transition.value.event });
  };
