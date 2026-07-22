// Adapter Drizzle do PartnerGeographyReadPort (módulo partners) — LEITURA read-only.
//
//   - listStates/listMunicipalities: SELECT `par_states`/`par_municipalities` WHERE
//     active = true, hidrata `name` do catálogo estático IBGE (sem persistência —
//     `domain/geography/{state,municipality}.ts`).
//   - Linha órfã (uf/ibgeCode fora do catálogo estático — não deveria ocorrer, o
//     catálogo é a fonte de validação na escrita) → tratada como infra corrompida,
//     loga e devolve err (não interrompe silenciosamente, não expõe row cru).
//
// ADR-0014: só lê `par_*`. ADR-0020: SELECT. Zero escrita. Zero throw cruzando a borda.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as State from '#src/modules/partners/domain/geography/state.ts';
import * as Municipality from '#src/modules/partners/domain/geography/municipality.ts';
import type {
  PartnerGeographyReadPort,
  PartnerGeographyReadError,
  PartnerStateView,
  PartnerMunicipalityView,
} from '#src/modules/partners/application/ports/geography-read.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import type { StateRow, MunicipalityRow } from '../schemas/mysql.ts';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-geography-read:${scope}] ${String(cause)}\n`);
};

const stateToView = (
  row: Readonly<StateRow>,
): Result<PartnerStateView, PartnerGeographyReadError> => {
  const found = State.findStateByAbbreviation(row.uf);
  if (!found.ok) {
    logRead('stateToView', `uf fora do catálogo estático: ${row.uf}`);
    return err('partner-geography-read-unavailable');
  }
  return ok({ ref: row.uf, name: found.value.name, uf: row.uf });
};

const municipalityToView = (
  row: Readonly<MunicipalityRow>,
): Result<PartnerMunicipalityView, PartnerGeographyReadError> => {
  const found = Municipality.findMunicipalityByCod(row.ibgeCode);
  if (!found.ok) {
    logRead('municipalityToView', `ibgeCode fora do catálogo estático: ${row.ibgeCode}`);
    return err('partner-geography-read-unavailable');
  }
  return ok({ ref: row.ibgeCode, name: found.value.name, uf: row.uf });
};

export const createDrizzleGeographyReadStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PartnerGeographyReadPort => {
  const { db, schema } = handle;

  const listStates = async (): Promise<
    Result<readonly PartnerStateView[], PartnerGeographyReadError>
  > => {
    try {
      const rows = await db
        .select()
        .from(schema.parStates)
        .where(eq(schema.parStates.active, true));
      const out: PartnerStateView[] = [];
      for (const row of rows) {
        const mapped = stateToView(row);
        if (!mapped.ok) return mapped;
        out.push(mapped.value);
      }
      return ok(out);
    } catch (cause) {
      logRead('listStates', cause);
      return err('partner-geography-read-unavailable');
    }
  };

  const listMunicipalities = async (): Promise<
    Result<readonly PartnerMunicipalityView[], PartnerGeographyReadError>
  > => {
    try {
      const rows = await db
        .select()
        .from(schema.parMunicipalities)
        .where(eq(schema.parMunicipalities.active, true));
      const out: PartnerMunicipalityView[] = [];
      for (const row of rows) {
        const mapped = municipalityToView(row);
        if (!mapped.ok) return mapped;
        out.push(mapped.value);
      }
      return ok(out);
    } catch (cause) {
      logRead('listMunicipalities', cause);
      return err('partner-geography-read-unavailable');
    }
  };

  return { listStates, listMunicipalities };
};
