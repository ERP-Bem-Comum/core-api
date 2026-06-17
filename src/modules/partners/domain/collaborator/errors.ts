import type { OccupationAreaError } from './occupation-area.ts';
import type { EmploymentRelationshipError } from './employment-relationship.ts';
import type { GenderIdentityError } from './gender-identity.ts';
import type { RaceError } from './race.ts';
import type { FoodCategoryError } from './food-category.ts';
import type { EducationError } from './education.ts';
import type { DisableReasonError } from './disable-reason.ts';
import type { PaymentTargetError } from '../shared/payment-target.ts';

// Erros do agregado `Collaborator` — string union kebab EN. Compõe os erros dos
// enums (validados em register/completeRegistration/deactivate).

export type CollaboratorError =
  | 'collaborator-name-required'
  | 'collaborator-email-required'
  | 'collaborator-email-invalid'
  | 'collaborator-role-required'
  | 'invalid-cpf'
  | 'collaborator-already-complete'
  | 'collaborator-already-inactive'
  | 'collaborator-already-active'
  | 'collaborator-inactive-requires-disable-reason'
  | PaymentTargetError
  | OccupationAreaError
  | EmploymentRelationshipError
  | GenderIdentityError
  | RaceError
  | FoodCategoryError
  | EducationError
  | DisableReasonError;
