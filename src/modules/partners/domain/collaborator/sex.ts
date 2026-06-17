import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Sexo biológico (US2). Campo NOVO e INDEPENDENTE de `genderIdentity` (identidade de gênero):
// sexo biológico ≠ identidade de gênero — ambos legítimos no cadastro (decisão de PO).
export type Sex = 'F' | 'M';
export type SexError = 'sex-invalid';

const VALUES: ReadonlySet<string> = new Set<Sex>(['F', 'M']);

export const parse = (raw: string): Result<Sex, SexError> =>
  VALUES.has(raw) ? ok(raw as Sex) : err('sex-invalid');
