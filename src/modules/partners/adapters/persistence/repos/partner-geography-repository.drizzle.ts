// Adapter Drizzle de PartnerGeographyRepository (módulo partners).
//
//   - findStateByUf / findMunicipalityByCode: SELECT + mapper.
//   - saveState / saveMunicipality: SELECT-then-UPDATE-or-INSERT (ADR-0020 — sem ODKU).
//   - listStates / listMunicipalities: SELECT all + mapper.
//
// ADR-0020: sem ODKU. ADR-0014: só par_*. Boundary: try/catch → Result (zero throw).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { PartnerGeographyRepository } from '#src/modules/partners/application/ports/partner-geography-repository.ts';
import type { PartnerState } from '#src/modules/partners/domain/geography/partner-state.ts';
import type { PartnerMunicipality } from '#src/modules/partners/domain/geography/partner-municipality.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  stateToInsert,
  stateFromRow,
  municipalityToInsert,
  municipalityFromRow,
  type GeographyMapperError,
} from '../mappers/partner-geography.mapper.ts';
import type { StateRow, MunicipalityRow } from '../schemas/mysql.ts';

const logRepo = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-geography-repo:${scope}] ${String(cause)}\n`);
};

const reconstructState = (
  row: Readonly<StateRow>,
): Result<PartnerState, 'geography-repo-unavailable'> => {
  const mapped = stateFromRow(row);
  if (mapped.ok) return mapped;
  logRepo('state-mapper', mapped.error satisfies GeographyMapperError);
  return err('geography-repo-unavailable');
};

const reconstructMunicipality = (
  row: Readonly<MunicipalityRow>,
): Result<PartnerMunicipality, 'geography-repo-unavailable'> => {
  const mapped = municipalityFromRow(row);
  if (mapped.ok) return mapped;
  logRepo('municipality-mapper', mapped.error satisfies GeographyMapperError);
  return err('geography-repo-unavailable');
};

export const createDrizzlePartnerGeographyStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): PartnerGeographyRepository => {
  const { db, schema } = handle;
  const statesTable = schema.parStates;
  const municipalitiesTable = schema.parMunicipalities;

  return {
    findStateByUf: async (uf) => {
      try {
        const rows = await db.select().from(statesTable).where(eq(statesTable.uf, uf)).limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstructState(row);
      } catch (cause) {
        logRepo('findStateByUf', cause);
        return err('geography-repo-unavailable');
      }
    },

    saveState: async (state) => {
      const now = clock.now();
      const row = stateToInsert(state, now);
      try {
        const existing = await db
          .select({ uf: statesTable.uf })
          .from(statesTable)
          .where(eq(statesTable.uf, row.uf))
          .limit(1);

        if (existing.length > 0) {
          const { createdAt: _createdAt, ...rest } = row;
          await db
            .update(statesTable)
            .set({ ...rest, updatedAt: now })
            .where(eq(statesTable.uf, row.uf));
        } else {
          await db.insert(statesTable).values(row);
        }
        return ok(undefined);
      } catch (cause) {
        logRepo('saveState', cause);
        return err('geography-repo-unavailable');
      }
    },

    listStates: async () => {
      try {
        const rows = await db.select().from(statesTable);
        const out: PartnerState[] = [];
        for (const row of rows) {
          const mapped = reconstructState(row);
          if (!mapped.ok) return mapped;
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('listStates', cause);
        return err('geography-repo-unavailable');
      }
    },

    findMunicipalityByCode: async (ibgeCode) => {
      try {
        const rows = await db
          .select()
          .from(municipalitiesTable)
          .where(eq(municipalitiesTable.ibgeCode, ibgeCode))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstructMunicipality(row);
      } catch (cause) {
        logRepo('findMunicipalityByCode', cause);
        return err('geography-repo-unavailable');
      }
    },

    saveMunicipality: async (municipality) => {
      const now = clock.now();
      const row = municipalityToInsert(municipality, now);
      try {
        const existing = await db
          .select({ ibgeCode: municipalitiesTable.ibgeCode })
          .from(municipalitiesTable)
          .where(eq(municipalitiesTable.ibgeCode, row.ibgeCode))
          .limit(1);

        if (existing.length > 0) {
          const { createdAt: _createdAt, ...rest } = row;
          await db
            .update(municipalitiesTable)
            .set({ ...rest, updatedAt: now })
            .where(eq(municipalitiesTable.ibgeCode, row.ibgeCode));
        } else {
          await db.insert(municipalitiesTable).values(row);
        }
        return ok(undefined);
      } catch (cause) {
        logRepo('saveMunicipality', cause);
        return err('geography-repo-unavailable');
      }
    },

    listMunicipalities: async () => {
      try {
        const rows = await db.select().from(municipalitiesTable);
        const out: PartnerMunicipality[] = [];
        for (const row of rows) {
          const mapped = reconstructMunicipality(row);
          if (!mapped.ok) return mapped;
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('listMunicipalities', cause);
        return err('geography-repo-unavailable');
      }
    },
  };
};
