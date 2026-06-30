import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Área de atuação do colaborador. ADR-0031 §D2: mantém os códigos legados LITERAIS
// (database.dbml Enum occupation_area). Rótulo PT-BR no formatter da CLI, não aqui.

export type OccupationArea = 'PARC' | 'DDI' | 'DCE' | 'EPV';
export type OccupationAreaError = 'invalid-occupation-area';

const VALUES: ReadonlySet<string> = new Set<OccupationArea>(['PARC', 'DDI', 'DCE', 'EPV']);

export const parse = (raw: string): Result<OccupationArea, OccupationAreaError> =>
  VALUES.has(raw) ? ok(raw as OccupationArea) : err('invalid-occupation-area');
