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
import type { Sex } from './sex.ts';
import type { CivilStatus } from './civil-status.ts';
import type { StateAbbreviation } from '../geography/state.ts';
import type {
  BankAccount,
  PixKey,
  BankAccountInput,
  PixKeyInput,
} from '../supplier/payment-target.ts';

export type RegistrationStatus = 'PreRegistration' | 'Complete';

// Território de atuação (#42): UF do catálogo + município como NOME livre (texto da issue).
export type CollaboratorTerritory = Readonly<{
  uf: StateAbbreviation | null;
  municipality: string | null;
}>;

// Shape de entrada do território (UF como string crua; validada no domínio).
export type CollaboratorTerritoryInput = Readonly<{
  uf: string | null;
  municipality: string | null;
}>;

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
  // PERFIL (#41): sexo (VO), estado civil (VO), filhos, PCD, afastamento, experiência pública.
  sex: Sex | null;
  maritalStatus: CivilStatus | null;
  hasChildren: boolean | null;
  childrenCount: number | null;
  childrenAges: string | null;
  isPwd: boolean | null;
  pwdDescription: string | null;
  isOnLeave: boolean | null;
  leaveDuration: string | null;
  leaveRenewable: boolean | null;
  leaveRenewalDuration: string | null;
  publicSectorExperienceDuration: string | null;
  // TERRITÓRIO (#42) e BANCÁRIO (#40 lado Colaborador) — todos nullable.
  territory: CollaboratorTerritory | null;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
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
  // TERRITÓRIO (#42) e BANCÁRIO (#40) opcionais já no pré-cadastro (omitidos = null).
  territory?: CollaboratorTerritoryInput | null;
  bankAccount?: BankAccountInput | null;
  pixKey?: PixKeyInput | null;
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
  // PERFIL (#41) / TERRITÓRIO (#42) / BANCÁRIO (#40) — OPCIONAIS (omitidos = não informados).
  // Opcionais para preservar chamadas de domínio legadas que só passam os campos originais;
  // a borda HTTP sempre envia `null` por default. sex/maritalStatus como string (validados aqui).
  sex?: string | null;
  maritalStatus?: string | null;
  hasChildren?: boolean | null;
  childrenCount?: number | null;
  childrenAges?: string | null;
  isPwd?: boolean | null;
  pwdDescription?: string | null;
  isOnLeave?: boolean | null;
  leaveDuration?: string | null;
  leaveRenewable?: boolean | null;
  leaveRenewalDuration?: string | null;
  publicSectorExperienceDuration?: string | null;
  // TERRITÓRIO (#42) — objeto { uf, municipality } (uf validada no domínio).
  territory?: CollaboratorTerritoryInput | null;
  // BANCÁRIO (#40 lado Colaborador) — shapes de input (validados no domínio).
  bankAccount?: BankAccountInput | null;
  pixKey?: PixKeyInput | null;
}>;

// Reidratação pela borda (mapper): VOs/enums já tipados. `rehydrate` reconstrói o
// estado (registro + soft-delete) e reaplica coerência; sem evento.
export type RehydrateCollaboratorInput = CollaboratorCore &
  Readonly<{
    status: 'Active' | 'Inactive';
    disableBy: DisableReason | null;
    deactivatedAt: Date | null;
  }>;
