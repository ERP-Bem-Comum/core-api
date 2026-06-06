/**
 * Adapter InMemory do `PartnerGeographyRepository` (módulo partners). Para teste/CLI.
 *
 * `Map<string, PartnerState>` e `Map<string, PartnerMunicipality>`.
 * `saveState`/`saveMunicipality` fazem upsert por chave natural (uf / ibgeCode).
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { PartnerGeographyRepository } from '#src/modules/partners/application/ports/partner-geography-repository.ts';
import type { PartnerState } from '#src/modules/partners/domain/geography/partner-state.ts';
import type { PartnerMunicipality } from '#src/modules/partners/domain/geography/partner-municipality.ts';

export type InMemoryPartnerGeographyStore = Readonly<{
  repository: PartnerGeographyRepository;
  clear: () => void;
}>;

export const makeInMemoryPartnerGeographyStore = (): InMemoryPartnerGeographyStore => {
  const states = new Map<string, PartnerState>();
  const municipalities = new Map<string, PartnerMunicipality>();

  const repository: PartnerGeographyRepository = {
    findStateByUf: async (uf) => ok(states.get(uf) ?? null),

    saveState: async (state) => {
      states.set(state.uf as unknown as string, state);
      return ok(undefined);
    },

    listStates: async () => ok([...states.values()]),

    findMunicipalityByCode: async (ibgeCode) => ok(municipalities.get(ibgeCode) ?? null),

    saveMunicipality: async (municipality) => {
      municipalities.set(municipality.ibgeCode as unknown as string, municipality);
      return ok(undefined);
    },

    listMunicipalities: async () => ok([...municipalities.values()]),
  };

  return {
    repository,
    clear: () => {
      states.clear();
      municipalities.clear();
    },
  };
};
