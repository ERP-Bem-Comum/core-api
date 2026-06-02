import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Raça/cor. ADR-0031 §D2: dado sensível, espelha categorias IBGE — mantido OPACO
// (não traduzido). database.dbml Enum race.

export type Race = 'AMARELO' | 'BRANCO' | 'PARDO' | 'INDIGENA' | 'PRETO' | 'PREFIRO_NAO_RESPONDER';
export type RaceError = 'invalid-race';

const VALUES: ReadonlySet<string> = new Set<Race>([
  'AMARELO',
  'BRANCO',
  'PARDO',
  'INDIGENA',
  'PRETO',
  'PREFIRO_NAO_RESPONDER',
]);

export const parse = (raw: string): Result<Race, RaceError> =>
  VALUES.has(raw) ? ok(raw as Race) : err('invalid-race');
