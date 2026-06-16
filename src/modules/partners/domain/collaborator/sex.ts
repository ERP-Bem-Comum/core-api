import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Sexo biológico (campo do cadastro completo — #41). Conjunto fechado F|M (legado).
// Distinto de `genderIdentity` (identidade de gênero) — são campos ortogonais.
//
// O slug do erro é `sex-invalid` (e não `invalid-sex`) porque a borda HTTP faz
// `toErrorEnvelope(code, code)`: o error-code do domínio É o slug público (#41 CA2).

export type Sex = 'F' | 'M';
export type SexError = 'sex-invalid';

const VALUES: ReadonlySet<string> = new Set<Sex>(['F', 'M']);

export const parse = (raw: string): Result<Sex, SexError> =>
  VALUES.has(raw) ? ok(raw as Sex) : err('sex-invalid');
