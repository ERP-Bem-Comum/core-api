/**
 * Use case `togglePartnerMunicipality` — marca/desmarca município como parceiro (idempotente).
 *
 * `action: 'activate'` → Active (cria ou reativa).
 * `action: 'deactivate'` → Inactive (desativa; idempotente se já Inactive).
 *
 * Sequência: valida código IBGE via `PartnerMunicipality.activate` → busca registro →
 * aplica transição → persiste.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PartnerMunicipality from '#src/modules/partners/domain/geography/partner-municipality.ts';
import type { PartnerMunicipality as PartnerMunicipalityType } from '#src/modules/partners/domain/geography/partner-municipality.ts';
import type {
  MunicipalityError,
  IbgeCode,
} from '#src/modules/partners/domain/geography/municipality.ts';
import type { StateAbbreviation } from '#src/modules/partners/domain/geography/state.ts';
import type {
  PartnerGeographyRepository,
  PartnerGeographyRepositoryError,
} from '../ports/partner-geography-repository.ts';

export type TogglePartnerMunicipalityCommand = Readonly<{
  rawIbgeCode: string;
  action: 'activate' | 'deactivate';
}>;

export type TogglePartnerMunicipalityView = Readonly<{
  ibgeCode: IbgeCode;
  uf: StateAbbreviation;
  isPartner: boolean;
}>;

export type TogglePartnerMunicipalityError = MunicipalityError | PartnerGeographyRepositoryError;

type Deps = Readonly<{ geographyRepo: PartnerGeographyRepository; clock: Clock }>;

export const togglePartnerMunicipality =
  (deps: Deps) =>
  async (
    cmd: TogglePartnerMunicipalityCommand,
  ): Promise<Result<TogglePartnerMunicipalityView, TogglePartnerMunicipalityError>> => {
    // Validate IBGE code via catalog
    const parsed = PartnerMunicipality.activate(cmd.rawIbgeCode);
    if (!parsed.ok) return parsed;

    // Fetch existing record
    const existing = await deps.geographyRepo.findMunicipalityByCode(cmd.rawIbgeCode);
    if (!existing.ok) return existing;

    const next: PartnerMunicipalityType =
      cmd.action === 'activate'
        ? existing.value === null
          ? parsed.value
          : PartnerMunicipality.reactivate(existing.value)
        : // action === 'deactivate'
          existing.value === null
          ? PartnerMunicipality.deactivate(parsed.value, deps.clock.now())
          : PartnerMunicipality.deactivate(existing.value, deps.clock.now());

    const saved = await deps.geographyRepo.saveMunicipality(next);
    if (!saved.ok) return saved;

    return ok({ ibgeCode: next.ibgeCode, uf: next.uf, isPartner: next.status === 'Active' });
  };
