import type { SiglaError } from './sigla.ts';

// Erros do agregado Program. String literal union (EN kebab-case), padrao auth/partners.
// `program-sigla-duplicated`, `program-not-found` e `program-repo-*` sao de application/
// adapter (nao do dominio puro) e ficam definidos nas suas camadas.

export type ProgramError =
  | 'program-name-required'
  | SiglaError
  | 'program-not-active'
  | 'program-not-inactive'
  | 'program-version-conflict';
