// Adapter Drizzle do PartnerGeographyReadPort (módulo partners) — LEITURA read-only.
//
//   - listStates/listMunicipalities: SELECT `par_states`/`par_municipalities` WHERE
//     active = true, hidrata `name` do catálogo estático IBGE (sem persistência —
//     `domain/geography/{state,municipality}.ts`).
//   - Linha órfã (uf/ibgeCode fora do catálogo estático — drift de catálogo, não deveria
//     ocorrer) → DEGRADA POR LINHA, nunca aborta a lista (uma órfã não pode zerar o
//     dropdown inteiro): estado cai no fallback de sigla (name = uf, paridade com o
//     legado); município é omitido (não há nome para exibir). Sempre logado.
//   - `err('partner-geography-read-unavailable')` fica reservado à FALHA REAL de query (catch).
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

// Estado órfão (uf fora do catálogo) → fallback de sigla (name = uf), paridade com o legado.
// Nunca aborta: uma linha inconsistente não pode zerar a lista.
const stateToView = (row: Readonly<StateRow>): PartnerStateView => {
  const found = State.findStateByAbbreviation(row.uf);
  if (!found.ok) {
    logRead('stateToView', `uf fora do catálogo estático (fallback de sigla): ${row.uf}`);
    return { ref: row.uf, name: row.uf, uf: row.uf };
  }
  return { ref: row.uf, name: found.value.name, uf: row.uf };
};

// Município órfão (ibgeCode fora do catálogo) → omitido (não há nome para exibir; `par_municipalities`
// não guarda nome). `null` sinaliza omissão ao mapeador de lista. Nunca aborta.
const municipalityToView = (row: Readonly<MunicipalityRow>): PartnerMunicipalityView | null => {
  const found = Municipality.findMunicipalityByCod(row.ibgeCode);
  if (!found.ok) {
    logRead(
      'municipalityToView',
      `ibgeCode fora do catálogo estático (linha omitida): ${row.ibgeCode}`,
    );
    return null;
  }
  return { ref: row.ibgeCode, name: found.value.name, uf: row.uf };
};

// Mappers de lista puros (testáveis sem banco): degradam por linha, nunca abortam.
export const mapStateRows = (rows: readonly Readonly<StateRow>[]): PartnerStateView[] =>
  rows.map(stateToView);

export const mapMunicipalityRows = (
  rows: readonly Readonly<MunicipalityRow>[],
): PartnerMunicipalityView[] => {
  const out: PartnerMunicipalityView[] = [];
  for (const row of rows) {
    const view = municipalityToView(row);
    if (view !== null) out.push(view);
  }
  return out;
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
      return ok(mapStateRows(rows));
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
      return ok(mapMunicipalityRows(rows));
    } catch (cause) {
      logRead('listMunicipalities', cause);
      return err('partner-geography-read-unavailable');
    }
  };

  return { listStates, listMunicipalities };
};
