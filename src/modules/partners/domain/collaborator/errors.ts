import type { OccupationAreaError } from './occupation-area.ts';
import type { EmploymentRelationshipError } from './employment-relationship.ts';
import type { GenderIdentityError } from './gender-identity.ts';
import type { RaceError } from './race.ts';
import type { FoodCategoryError } from './food-category.ts';
import type { EducationError } from './education.ts';
import type { DisableReasonError } from './disable-reason.ts';
import type { PaymentTargetError } from '../shared/payment-target.ts';
import type { SexError } from './sex.ts';
import type { MaritalStatusError } from './civil-status.ts';
import type { TerritoryError } from './territory.ts';

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
  | 'collaborator-children-inconsistent'
  // #1054: texto livre de "Outra identidade de gênero" só é aceito quando genderIdentity = OUTRO
  // (fail-fast — o foodCategory não guarda o caso análogo, e a issue decidiu RECUSAR).
  | 'gender-identity-description-requires-other'
  // #1053: PUT pode SUBSTITUIR o território, nunca APAGÁ-LO — zerar UF e município de quem já tem
  // território gravado é recusado (decisão da P.O.).
  | 'collaborator-territory-removal-forbidden'
  // RG, nascimento e raça: o PUT preenche o que está vazio, mas não troca o que já foi gravado
  // (decisão da P.O., 19/10/2026).
  | 'collaborator-personal-data-immutable'
  // #1072: limites e nascimento validados no domínio (não só na borda) — sem eles o MySQL recusa
  // (1406/1292) e o repositório devolve `collaborator-repo-unavailable`, um 503 falso.
  | 'collaborator-rg-too-long'
  | 'collaborator-gender-identity-description-too-long'
  | 'collaborator-date-of-birth-invalid'
  | 'collaborator-date-of-birth-in-future'
  | PaymentTargetError
  | SexError
  | MaritalStatusError
  | TerritoryError
  | OccupationAreaError
  | EmploymentRelationshipError
  | GenderIdentityError
  | RaceError
  | FoodCategoryError
  | EducationError
  | DisableReasonError;
