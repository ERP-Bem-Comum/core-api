/**
 * Use case `listPartnerStates` — lista as 27 UFs com flag `isPartner`.
 *
 * Cruza o catálogo estático (`State.listStates`) com as parcerias persistidas.
 * UFs sem registro persistido retornam `isPartner: false`.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import * as State from '#src/modules/partners/domain/geography/state.ts';
import type { StateAbbreviation } from '#src/modules/partners/domain/geography/state.ts';
import type {
  PartnerGeographyRepository,
  PartnerGeographyRepositoryError,
} from '../ports/partner-geography-repository.ts';

export type PartnerStateView = Readonly<{
  uf: StateAbbreviation;
  isPartner: boolean;
}>;

type Deps = Readonly<{ geographyRepo: PartnerGeographyRepository }>;

export const listPartnerStates =
  (deps: Deps) =>
  async (): Promise<Result<readonly PartnerStateView[], PartnerGeographyRepositoryError>> => {
    const partnered = await deps.geographyRepo.listStates();
    if (!partnered.ok) return partnered;

    const activeUfs = new Set(
      partnered.value.filter((s) => s.status === 'Active').map((s) => s.uf as unknown as string),
    );

    const views: PartnerStateView[] = State.listStates().map((s) => ({
      uf: s.abbreviation,
      isPartner: activeUfs.has(s.abbreviation as unknown as string),
    }));

    return ok(views);
  };
