/**
 * Tipos do agregado `Collaborator` (Colaborador). Legado `collaborators`
 * (database.dbml:84). Duas dimensões de estado ORTOGONAIS:
 *   - `registrationStatus` (PreRegistration→Complete): campo de união simples. A
 *     transição preenche os campos pessoais; não há subconjunto obrigatório (D3).
 *   - `status` (Active/Inactive): soft-delete discriminado. Inactive carrega
 *     `disableBy` (obrigatório) + `deactivatedAt`.
 *
 * `cpf` reusa o VO `Cpf` do kernel. Enums mantêm código legado (D2).
 */

import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type { CollaboratorId } from './collaborator-id.ts';
import type { OccupationArea } from './occupation-area.ts';
import type { EmploymentRelationship } from './employment-relationship.ts';
import type { GenderIdentity } from './gender-identity.ts';
import type { Race } from './race.ts';
import type { FoodCategory } from './food-category.ts';
import type { Education } from './education.ts';
import type { DisableReason } from './disable-reason.ts';

export type RegistrationStatus = 'PreRegistration' | 'Complete';

// Campos pessoais (preenchidos no completeRegistration; todos nullable — D3).
type PersonalFields = Readonly<{
  rg: string | null;
  dateOfBirth: Date | null;
  genderIdentity: GenderIdentity | null;
  race: Race | null;
  education: Education | null;
  foodCategory: FoodCategory | null;
  foodCategoryDescription: string | null;
  completeAddress: string | null;
  telephone: string | null;
  emergencyContactName: string | null;
  emergencyContactTelephone: string | null;
  allergies: string | null;
  biography: string | null;
  experienceInThePublicSector: boolean | null;
}>;

type CollaboratorCore = Readonly<{
  id: CollaboratorId;
  // PRE_CADASTRO obrigatórios (OpenAPI CreateCollaborator.required).
  name: string;
  email: string;
  cpf: Cpf;
  occupationArea: OccupationArea;
  role: string;
  startOfContract: Date;
  employmentRelationship: EmploymentRelationship;
  registrationStatus: RegistrationStatus;
}> &
  PersonalFields;

export type ActiveCollaborator = CollaboratorCore & Readonly<{ status: 'Active' }>;

export type InactiveCollaborator = CollaboratorCore &
  Readonly<{ status: 'Inactive'; disableBy: DisableReason; deactivatedAt: Date }>;

export type Collaborator = ActiveCollaborator | InactiveCollaborator;

export type RegisterCollaboratorInput = Readonly<{
  id: CollaboratorId;
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
  registeredAt: Date;
}>;

/** Payload de edição cadastral (PUT total): os 7 campos cadastrais. Pessoais/estado preservados. */
export type EditCollaboratorInput = Readonly<{
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
}>;

// Payload de auto-cadastro (campos pessoais; enums como string, validados no domínio).
export type CompleteRegistrationInput = Readonly<{
  rg: string | null;
  dateOfBirth: Date | null;
  genderIdentity: string | null;
  race: string | null;
  education: string | null;
  foodCategory: string | null;
  foodCategoryDescription: string | null;
  completeAddress: string | null;
  telephone: string | null;
  emergencyContactName: string | null;
  emergencyContactTelephone: string | null;
  allergies: string | null;
  biography: string | null;
  experienceInThePublicSector: boolean | null;
}>;

// Reidratação pela borda (mapper): VOs/enums já tipados. `rehydrate` reconstrói o
// estado (registro + soft-delete) e reaplica coerência; sem evento.
export type RehydrateCollaboratorInput = CollaboratorCore &
  Readonly<{
    status: 'Active' | 'Inactive';
    disableBy: DisableReason | null;
    deactivatedAt: Date | null;
  }>;
