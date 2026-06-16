import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Estado civil (campo do cadastro completo — #41). Conjunto fechado EN.
//
// O slug do erro é `marital-status-invalid` (e não `invalid-civil-status`) porque a borda
// HTTP faz `toErrorEnvelope(code, code)`: o error-code do domínio É o slug público (#41 CA3).

export type CivilStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'stable_union';
export type CivilStatusError = 'marital-status-invalid';

const VALUES: ReadonlySet<string> = new Set<CivilStatus>([
  'single',
  'married',
  'divorced',
  'widowed',
  'stable_union',
]);

export const parse = (raw: string): Result<CivilStatus, CivilStatusError> =>
  VALUES.has(raw) ? ok(raw as CivilStatus) : err('marital-status-invalid');
