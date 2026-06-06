/**
 * Use case `listPartnerMunicipalities` — lista municípios de uma UF com flag `isPartner`.
 *
 * Filtra o catálogo IBGE por UF e cruza com parcerias persistidas.
 * Cross-state: `listMunicipalities` retorna todos os parceiros independente de UF;
 * `?uf=` filtra apenas o catálogo de candidatos.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import * as Municipality from '#src/modules/partners/domain/geography/municipality.ts';
import type { StateError } from '#src/modules/partners/domain/geography/state.ts';
import type { IbgeCode } from '#src/modules/partners/domain/geography/municipality.ts';
import type { StateAbbreviation } from '#src/modules/partners/domain/geography/state.ts';
import type {
  PartnerGeographyRepository,
  PartnerGeographyRepositoryError,
} from '../ports/partner-geography-repository.ts';

export type PartnerMunicipalityView = Readonly<{
  ibgeCode: IbgeCode;
  uf: StateAbbreviation;
  name: string;
  isPartner: boolean;
}>;

export type ListPartnerMunicipalitiesError = StateError | PartnerGeographyRepositoryError;

type Deps = Readonly<{ geographyRepo: PartnerGeographyRepository }>;

export const listPartnerMunicipalities =
  (deps: Deps) =>
  async (
    rawUf: string,
  ): Promise<Result<readonly PartnerMunicipalityView[], ListPartnerMunicipalitiesError>> => {
    // Validate UF and filter catalog
    const catalogResult = Municipality.listMunicipalitiesByUf(rawUf);
    if (!catalogResult.ok) return catalogResult;

    const partnered = await deps.geographyRepo.listMunicipalities();
    if (!partnered.ok) return partnered;

    const activeIbgeCodes = new Set(
      partnered.value
        .filter((m) => m.status === 'Active')
        .map((m) => m.ibgeCode as unknown as string),
    );

    const views: PartnerMunicipalityView[] = catalogResult.value.map((m) => ({
      ibgeCode: m.cod,
      uf: m.uf,
      name: m.name,
      isPartner: activeIbgeCodes.has(m.cod as unknown as string),
    }));

    return ok(views);
  };
