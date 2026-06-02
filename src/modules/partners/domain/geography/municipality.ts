import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';
import * as State from './state.ts';
import type { StateAbbreviation, StateError } from './state.ts';
import { MUNICIPALITIES } from './municipalities.data.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as Municipality from '#src/modules/partners/domain/geography/municipality.ts'`.
//
// Catálogo read-only dos municípios IBGE (ADR-0031 §3 + decisão D7: seed estático).
// Dados em `municipalities.data.ts` (gerado de fonte IBGE em build-time). A `uf` de
// cada município reusa o VO `StateAbbreviation` — integridade garantida na carga.
//
// NÃO expõe `generate` — município não é gerado, é selecionado do catálogo.

export type IbgeCode = Brand<string, 'IbgeCode'>;
export type MunicipalityError = 'invalid-ibge-code';

export type Municipality = Readonly<{
  cod: IbgeCode;
  name: string;
  uf: StateAbbreviation;
}>;

const IBGE_CODE = /^\d{7}$/;

const MUNICIPALITIES_LIST: readonly Municipality[] = MUNICIPALITIES.map(([cod, name, uf]) => ({
  cod: cod as IbgeCode,
  name,
  uf: uf as StateAbbreviation,
}));

const BY_COD: ReadonlyMap<string, Municipality> = new Map(
  MUNICIPALITIES_LIST.map((m) => [m.cod as unknown as string, m]),
);

/** `parse` valida um código IBGE de município (exatamente 7 dígitos). */
export const parse = (raw: string): Result<IbgeCode, MunicipalityError> =>
  IBGE_CODE.test(raw) ? ok(raw as IbgeCode) : err('invalid-ibge-code');

/** Catálogo completo dos municípios, ordenado por código IBGE. */
export const listMunicipalities = (): readonly Municipality[] => MUNICIPALITIES_LIST;

/** Resolve um município pelo código IBGE. */
export const findMunicipalityByCod = (raw: string): Result<Municipality, MunicipalityError> => {
  const found = BY_COD.get(raw);
  return found === undefined ? err('invalid-ibge-code') : ok(found);
};

/** Municípios de uma UF; valida a sigla via `StateAbbreviation` (erro se inexistente). */
export const listMunicipalitiesByUf = (
  rawUf: string,
): Result<readonly Municipality[], StateError> => {
  const parsed = State.parse(rawUf);
  if (!parsed.ok) return parsed;
  const uf = parsed.value as unknown as string;
  return ok(MUNICIPALITIES_LIST.filter((m) => (m.uf as unknown as string) === uf));
};
