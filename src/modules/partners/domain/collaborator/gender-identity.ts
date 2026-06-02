import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Identidade de gênero. ADR-0031 §D2: dado sensível, espelha rótulos legados —
// mantido OPACO (não traduzido). database.dbml Enum gender_identity.

export type GenderIdentity =
  | 'PREFIRO_NAO_RESPONDER'
  | 'HOMEM_CIS'
  | 'HOMEM_TRANS'
  | 'MULHER_CIS'
  | 'MULHER_TRANS'
  | 'TRAVESTI'
  | 'NAO_BINARIO'
  | 'OUTRO';
export type GenderIdentityError = 'invalid-gender-identity';

const VALUES: ReadonlySet<string> = new Set<GenderIdentity>([
  'PREFIRO_NAO_RESPONDER',
  'HOMEM_CIS',
  'HOMEM_TRANS',
  'MULHER_CIS',
  'MULHER_TRANS',
  'TRAVESTI',
  'NAO_BINARIO',
  'OUTRO',
]);

export const parse = (raw: string): Result<GenderIdentity, GenderIdentityError> =>
  VALUES.has(raw) ? ok(raw as GenderIdentity) : err('invalid-gender-identity');
