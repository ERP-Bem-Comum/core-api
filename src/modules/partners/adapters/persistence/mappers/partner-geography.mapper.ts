// Mapper para parcerias territoriais: row MySQL ↔ domain entities.
//
//   - stateToInsert(state, now): NewStateRow
//   - stateFromRow(row): Result<PartnerState, GeographyMapperError>
//   - municipalityToInsert(municipality, now): NewMunicipalityRow
//   - municipalityFromRow(row): Result<PartnerMunicipality, GeographyMapperError>
//
// Reidrata branded types via `State.parse` / `Municipality.parse`.
// Zero throw — tudo em Result. ADR-0020 / ADR-0014.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as State from '#src/modules/partners/domain/geography/state.ts';
import * as Municipality from '#src/modules/partners/domain/geography/municipality.ts';
import type { PartnerState } from '#src/modules/partners/domain/geography/partner-state.ts';
import type { PartnerMunicipality } from '#src/modules/partners/domain/geography/partner-municipality.ts';
import type {
  StateRow,
  NewStateRow,
  MunicipalityRow,
  NewMunicipalityRow,
} from '../schemas/mysql.ts';

export type GeographyMapperError =
  | 'geography-mapper-invalid-uf'
  | 'geography-mapper-invalid-ibge-code'
  | 'geography-mapper-invalid-state';

// ─── par_states ──────────────────────────────────────────────────────────────

export const stateToInsert = (state: PartnerState, now: Date): NewStateRow => ({
  uf: state.uf as unknown as string,
  active: state.status === 'Active',
  deactivatedAt: state.status === 'Inactive' ? state.deactivatedAt : null,
  createdAt: now,
  updatedAt: now,
});

export const stateFromRow = (
  row: Readonly<StateRow>,
): Result<PartnerState, GeographyMapperError> => {
  const uf = State.parse(row.uf);
  if (!uf.ok) return err('geography-mapper-invalid-uf');

  if (row.active) {
    return ok(immutable({ uf: uf.value, status: 'Active' }) as PartnerState);
  }

  if (row.deactivatedAt === null) {
    return err('geography-mapper-invalid-state');
  }

  return ok(
    immutable({
      uf: uf.value,
      status: 'Inactive',
      deactivatedAt: row.deactivatedAt,
    }) as PartnerState,
  );
};

// ─── par_municipalities ───────────────────────────────────────────────────────

export const municipalityToInsert = (
  municipality: PartnerMunicipality,
  now: Date,
): NewMunicipalityRow => ({
  ibgeCode: municipality.ibgeCode as unknown as string,
  uf: municipality.uf as unknown as string,
  active: municipality.status === 'Active',
  deactivatedAt: municipality.status === 'Inactive' ? municipality.deactivatedAt : null,
  createdAt: now,
  updatedAt: now,
});

export const municipalityFromRow = (
  row: Readonly<MunicipalityRow>,
): Result<PartnerMunicipality, GeographyMapperError> => {
  const ibgeCode = Municipality.parse(row.ibgeCode);
  if (!ibgeCode.ok) return err('geography-mapper-invalid-ibge-code');

  const uf = State.parse(row.uf);
  if (!uf.ok) return err('geography-mapper-invalid-uf');

  if (row.active) {
    return ok(
      immutable({
        ibgeCode: ibgeCode.value,
        uf: uf.value,
        status: 'Active',
      }) as PartnerMunicipality,
    );
  }

  if (row.deactivatedAt === null) {
    return err('geography-mapper-invalid-state');
  }

  return ok(
    immutable({
      ibgeCode: ibgeCode.value,
      uf: uf.value,
      status: 'Inactive',
      deactivatedAt: row.deactivatedAt,
    }) as PartnerMunicipality,
  );
};
