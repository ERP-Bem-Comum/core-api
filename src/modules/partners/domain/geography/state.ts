import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as State from '#src/modules/partners/domain/geography/state.ts'`.
//
// Catálogo read-only das Unidades Federativas (ADR-0031 §3 + decisão D7: seed estático,
// não CRUD). As 27 UFs são dado de referência IBGE estável — constante de domínio, sem
// tabela nem persistência. `StateAbbreviation` só é válida se pertencer ao conjunto.
//
// NÃO expõe `generate` — UF não é gerada, é selecionada do catálogo fixo.

export type StateAbbreviation = Brand<string, 'StateAbbreviation'>;
export type StateError = 'invalid-state';

export type BrazilianState = Readonly<{
  abbreviation: StateAbbreviation;
  name: string;
}>;

// 26 estados + Distrito Federal, ordenados por sigla. Nomes em PT (dado real).
const CATALOG: readonly Readonly<{ abbreviation: string; name: string }>[] = [
  { abbreviation: 'AC', name: 'Acre' },
  { abbreviation: 'AL', name: 'Alagoas' },
  { abbreviation: 'AM', name: 'Amazonas' },
  { abbreviation: 'AP', name: 'Amapá' },
  { abbreviation: 'BA', name: 'Bahia' },
  { abbreviation: 'CE', name: 'Ceará' },
  { abbreviation: 'DF', name: 'Distrito Federal' },
  { abbreviation: 'ES', name: 'Espírito Santo' },
  { abbreviation: 'GO', name: 'Goiás' },
  { abbreviation: 'MA', name: 'Maranhão' },
  { abbreviation: 'MG', name: 'Minas Gerais' },
  { abbreviation: 'MS', name: 'Mato Grosso do Sul' },
  { abbreviation: 'MT', name: 'Mato Grosso' },
  { abbreviation: 'PA', name: 'Pará' },
  { abbreviation: 'PB', name: 'Paraíba' },
  { abbreviation: 'PE', name: 'Pernambuco' },
  { abbreviation: 'PI', name: 'Piauí' },
  { abbreviation: 'PR', name: 'Paraná' },
  { abbreviation: 'RJ', name: 'Rio de Janeiro' },
  { abbreviation: 'RN', name: 'Rio Grande do Norte' },
  { abbreviation: 'RO', name: 'Rondônia' },
  { abbreviation: 'RR', name: 'Roraima' },
  { abbreviation: 'RS', name: 'Rio Grande do Sul' },
  { abbreviation: 'SC', name: 'Santa Catarina' },
  { abbreviation: 'SE', name: 'Sergipe' },
  { abbreviation: 'SP', name: 'São Paulo' },
  { abbreviation: 'TO', name: 'Tocantins' },
] as const;

const STATES: readonly BrazilianState[] = CATALOG.map((s) => ({
  abbreviation: s.abbreviation as StateAbbreviation,
  name: s.name,
}));

const BY_ABBREVIATION: ReadonlyMap<string, BrazilianState> = new Map(
  STATES.map((s) => [s.abbreviation as unknown as string, s]),
);

const normalize = (raw: string): string => raw.trim().toUpperCase();

/** `parse` normaliza (trim + maiúsculas) e valida pertencimento ao conjunto das 27 UFs. */
export const parse = (raw: string): Result<StateAbbreviation, StateError> => {
  const candidate = normalize(raw);
  return BY_ABBREVIATION.has(candidate) ? ok(candidate as StateAbbreviation) : err('invalid-state');
};

/** Catálogo completo das 27 UFs, ordenado por sigla. */
export const listStates = (): readonly BrazilianState[] => STATES;

/** Resolve uma UF pelo seu código; normaliza a entrada. */
export const findStateByAbbreviation = (raw: string): Result<BrazilianState, StateError> => {
  const found = BY_ABBREVIATION.get(normalize(raw));
  return found === undefined ? err('invalid-state') : ok(found);
};
