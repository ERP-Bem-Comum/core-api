/**
 * Entity `PartnerMunicipality` — parceria territorial por município (soft-delete, ADR-0001 da feature).
 *
 * Identidade: `IbgeCode` (reusa o VO de `municipality.ts`). `uf` é derivado do catálogo IBGE.
 * Ciclo de vida idêntico ao `PartnerState`:
 *   - `activate(rawIbgeCode)` — valida via `Municipality.findMunicipalityByCod`, carrega `uf`.
 *   - `deactivate(state, at)` — idempotente.
 *   - `reactivate(state)` — idempotente.
 *
 * Sem `class`, sem `throw`. UF derivada do catálogo — sem FK cross-tabela (ADR-0031 §3).
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as Municipality from './municipality.ts';
import type { IbgeCode, MunicipalityError } from './municipality.ts';
import type { StateAbbreviation } from './state.ts';

export type ActivePartnerMunicipality = Readonly<{
  ibgeCode: IbgeCode;
  uf: StateAbbreviation;
  status: 'Active';
}>;

export type InactivePartnerMunicipality = Readonly<{
  ibgeCode: IbgeCode;
  uf: StateAbbreviation;
  status: 'Inactive';
  deactivatedAt: Date;
}>;

export type PartnerMunicipality = ActivePartnerMunicipality | InactivePartnerMunicipality;

/**
 * Smart constructor: valida código IBGE via catálogo, carrega `uf` do registro encontrado.
 * Retorna Active.
 */
export const activate = (
  rawIbgeCode: string,
): Result<ActivePartnerMunicipality, MunicipalityError> => {
  const found = Municipality.findMunicipalityByCod(rawIbgeCode);
  if (!found.ok) return found;
  return ok(
    immutable({
      ibgeCode: found.value.cod,
      uf: found.value.uf,
      status: 'Active',
    }) as ActivePartnerMunicipality,
  );
};

/**
 * Desativa parceria de município (soft-delete). Idempotente: Inactive permanece Inactive.
 * `at` injetado pelo caller.
 */
export const deactivate = (state: PartnerMunicipality, at: Date): InactivePartnerMunicipality => {
  if (state.status === 'Inactive') return state;
  return immutable({
    ibgeCode: state.ibgeCode,
    uf: state.uf,
    status: 'Inactive',
    deactivatedAt: at,
  }) as InactivePartnerMunicipality;
};

/** Reativa parceria de município. Idempotente: Active permanece Active. */
export const reactivate = (state: PartnerMunicipality): ActivePartnerMunicipality => {
  if (state.status === 'Active') return state;
  return immutable({
    ibgeCode: state.ibgeCode,
    uf: state.uf,
    status: 'Active',
  }) as ActivePartnerMunicipality;
};
