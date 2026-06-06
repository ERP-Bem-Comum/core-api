import type { OccupationAreaError } from '../collaborator/occupation-area.ts';
import type { EmploymentRelationshipError } from '../collaborator/employment-relationship.ts';

// Erros do agregado `Act` — string union kebab EN.

export type ActError =
  | 'act-name-required'
  | 'act-email-required'
  | 'act-email-invalid'
  | 'act-role-required'
  | 'invalid-cpf'
  | 'act-already-inactive'
  | 'act-already-active'
  | OccupationAreaError
  | EmploymentRelationshipError;
