/**
 * Use case `togglePartnerState` — marca/desmarca uma UF como parceira (idempotente).
 *
 * `action: 'activate'` → Active (cria ou reativa).
 * `action: 'deactivate'` → Inactive (desativa; idempotente se já Inactive).
 *
 * Sequência: valida UF via `PartnerState.activate` → busca registro existente →
 * aplica transição → persiste.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PartnerState from '#src/modules/partners/domain/geography/partner-state.ts';
import type { PartnerState as PartnerStateType } from '#src/modules/partners/domain/geography/partner-state.ts';
import type { StateError } from '#src/modules/partners/domain/geography/state.ts';
import type { StateAbbreviation } from '#src/modules/partners/domain/geography/state.ts';
import type {
  PartnerGeographyRepository,
  PartnerGeographyRepositoryError,
} from '../ports/partner-geography-repository.ts';

export type TogglePartnerStateCommand = Readonly<{
  rawUf: string;
  action: 'activate' | 'deactivate';
}>;

export type TogglePartnerStateView = Readonly<{
  uf: StateAbbreviation;
  isPartner: boolean;
}>;

export type TogglePartnerStateError = StateError | PartnerGeographyRepositoryError;

type Deps = Readonly<{ geographyRepo: PartnerGeographyRepository; clock: Clock }>;

export const togglePartnerState =
  (deps: Deps) =>
  async (
    cmd: TogglePartnerStateCommand,
  ): Promise<Result<TogglePartnerStateView, TogglePartnerStateError>> => {
    // Validate UF via catalog
    const parsed = PartnerState.activate(cmd.rawUf);
    if (!parsed.ok) return parsed;

    const uf = parsed.value.uf;

    // Fetch existing record
    const existing = await deps.geographyRepo.findStateByUf(uf as unknown as string);
    if (!existing.ok) return existing;

    const next: PartnerStateType =
      cmd.action === 'activate'
        ? // existing null or Inactive → Active; already Active → no-op (idempotent)
          existing.value === null
          ? parsed.value
          : PartnerState.reactivate(existing.value)
        : // action === 'deactivate'
          existing.value === null
          ? // Never activated — create as Inactive right away
            PartnerState.deactivate(parsed.value, deps.clock.now())
          : PartnerState.deactivate(existing.value, deps.clock.now());

    const saved = await deps.geographyRepo.saveState(next);
    if (!saved.ok) return saved;

    return ok({ uf: next.uf, isPartner: next.status === 'Active' });
  };
