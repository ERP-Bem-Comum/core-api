/**
 * Port `PartnerGeographyRepository` — contrato de persistência de parcerias territoriais.
 *
 * Operações para `PartnerState` e `PartnerMunicipality` (soft-delete — ADR-0001 da feature).
 * Posicionado em `application/ports/` pois o domínio é simples (sem invariante cross-agregado):
 * o port é consumido pelos use cases de toggle.
 *
 * Adapters esperados:
 *   - `InMemoryPartnerGeographyRepository` — teste/CLI (driver memory).
 *   - `DrizzlePartnerGeographyRepository` — MySQL `par_states`/`par_municipalities` (ADR-0020).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { PartnerState } from '#src/modules/partners/domain/geography/partner-state.ts';
import type { PartnerMunicipality } from '#src/modules/partners/domain/geography/partner-municipality.ts';

export type PartnerGeographyRepositoryError = 'geography-repo-unavailable'; // transient (timeout/conexão) no adapter real

export type PartnerGeographyRepository = Readonly<{
  /** Retorna o `PartnerState` persistido para a UF, ou `null` se nunca foi registrado. */
  findStateByUf: (
    uf: string,
  ) => Promise<Result<PartnerState | null, PartnerGeographyRepositoryError>>;

  /** Persiste (upsert) o estado de parceria de uma UF. */
  saveState: (state: PartnerState) => Promise<Result<void, PartnerGeographyRepositoryError>>;

  /** Lista todas as parcerias de estado persistidas. */
  listStates: () => Promise<Result<readonly PartnerState[], PartnerGeographyRepositoryError>>;

  /** Retorna o `PartnerMunicipality` persistido para o código IBGE, ou `null`. */
  findMunicipalityByCode: (
    ibgeCode: string,
  ) => Promise<Result<PartnerMunicipality | null, PartnerGeographyRepositoryError>>;

  /** Persiste (upsert) o estado de parceria de um município. */
  saveMunicipality: (
    municipality: PartnerMunicipality,
  ) => Promise<Result<void, PartnerGeographyRepositoryError>>;

  /** Lista todas as parcerias de município persistidas. */
  listMunicipalities: () => Promise<
    Result<readonly PartnerMunicipality[], PartnerGeographyRepositoryError>
  >;
}>;
