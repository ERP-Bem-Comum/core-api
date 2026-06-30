import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Escolaridade. ADR-0031 §D2: códigos legados LITERAIS (database.dbml Enum
// education). Rótulo PT-BR no formatter da CLI, não aqui.

export type Education =
  | 'EDUCACAO_INFANTIL'
  | 'ENSINO_FUNDAMENTAL'
  | 'ENSINO_MEDIO'
  | 'ENSINO_SUPERIOR'
  | 'POS_GRADUACAO'
  | 'MESTRADO'
  | 'DOUTORADO';
export type EducationError = 'invalid-education';

const VALUES: ReadonlySet<string> = new Set<Education>([
  'EDUCACAO_INFANTIL',
  'ENSINO_FUNDAMENTAL',
  'ENSINO_MEDIO',
  'ENSINO_SUPERIOR',
  'POS_GRADUACAO',
  'MESTRADO',
  'DOUTORADO',
]);

export const parse = (raw: string): Result<Education, EducationError> =>
  VALUES.has(raw) ? ok(raw as Education) : err('invalid-education');
