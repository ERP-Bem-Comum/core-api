import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as State from '../geography/state.ts';

// Território de atuação do Colaborador (US2 feature 015). VO imutável que REFERENCIA o
// catálogo geográfico: `uf` só é válida se for sigla IBGE (State.parse); `municipality` é
// texto livre (sem catálogo exaustivo nesta feature). Distinto da parceria territorial
// (par_states/par_municipalities, ADR-0035) — aqui é atributo do colaborador.
export type Territory = Readonly<{ uf: string | null; municipality: string | null }>;
export type TerritoryError = 'territory-uf-invalid';

export type TerritoryInput = Readonly<{ uf: string | null; municipality: string | null }>;

const blankToNull = (s: string | null): string | null => {
  if (s === null) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
};

export const createTerritory = (input: TerritoryInput): Result<Territory, TerritoryError> => {
  let uf: string | null = null;
  if (input.uf !== null) {
    const parsed = State.parse(input.uf);
    if (!parsed.ok) return err('territory-uf-invalid');
    uf = String(parsed.value);
  }
  return ok({ uf, municipality: blankToNull(input.municipality) });
};
