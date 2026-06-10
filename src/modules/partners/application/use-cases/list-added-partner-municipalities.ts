/**
 * Use case `listAddedPartnerMunicipalities` — municípios parceiros de TODAS as UFs.
 *
 * Diferente de `listPartnerMunicipalities` (que filtra o catálogo por UF), este lista os
 * registros de parceria persistidos com status Active (independente da UF), resolvendo
 * `name` via catálogo IBGE. Alimenta o painel "Municípios Parceiros Adicionados" (cross-state).
 * Busca/paginação ficam na borda HTTP (sobre a lista ordenada por nome).
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import * as Municipality from '#src/modules/partners/domain/geography/municipality.ts';
import type { IbgeCode } from '#src/modules/partners/domain/geography/municipality.ts';
import type { StateAbbreviation } from '#src/modules/partners/domain/geography/state.ts';
import type {
  PartnerGeographyRepository,
  PartnerGeographyRepositoryError,
} from '../ports/partner-geography-repository.ts';

export type AddedMunicipalityView = Readonly<{
  ibgeCode: IbgeCode;
  uf: StateAbbreviation;
  name: string;
}>;

type Deps = Readonly<{ geographyRepo: PartnerGeographyRepository }>;

export const listAddedPartnerMunicipalities =
  (deps: Deps) =>
  async (): Promise<Result<readonly AddedMunicipalityView[], PartnerGeographyRepositoryError>> => {
    const partnered = await deps.geographyRepo.listMunicipalities();
    if (!partnered.ok) return partnered;

    const views: AddedMunicipalityView[] = [];
    for (const m of partnered.value) {
      if (m.status !== 'Active') continue;
      // `name` não vive no agregado de parceria; resolve no catálogo IBGE (sempre presente,
      // pois `activate` valida o código). Código fora do catálogo é ignorado (defensivo).
      const found = Municipality.findMunicipalityByCod(m.ibgeCode as unknown as string);
      if (!found.ok) continue;
      views.push({ ibgeCode: m.ibgeCode, uf: m.uf, name: found.value.name });
    }

    views.sort((a, b) => a.name.localeCompare(b.name));
    return ok(views);
  };
