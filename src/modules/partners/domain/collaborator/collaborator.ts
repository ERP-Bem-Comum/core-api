/**
 * Operações do agregado `Collaborator`. Consumir via `import * as Collaborator`.
 * IDs/instantes injetados. Duas dimensões de estado (registro + soft-delete).
 *
 *   - `register` — nasce Active + PreRegistration (campos pessoais vazios).
 *   - `completeRegistration` — PreRegistration→Complete + merge dos pessoais.
 *   - `deactivate`/`reactivate` — soft-delete (Inactive carrega `disableBy`).
 *   - `rehydrate` — reconstrói estado persistido, sem evento.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as OccupationArea from './occupation-area.ts';
import * as EmploymentRelationship from './employment-relationship.ts';
import * as GenderIdentity from './gender-identity.ts';
import * as Race from './race.ts';
import * as FoodCategory from './food-category.ts';
import * as Education from './education.ts';
import * as DisableReason from './disable-reason.ts';
import * as Sex from './sex.ts';
import * as CivilStatus from './civil-status.ts';
import * as State from '../geography/state.ts';
import * as PaymentTarget from '../supplier/payment-target.ts';
import type { BankAccount, PixKey } from '../supplier/payment-target.ts';
import type { CollaboratorEvent } from './events.ts';
import type { CollaboratorError } from './errors.ts';
import type {
  ActiveCollaborator,
  Collaborator,
  CollaboratorTerritory,
  CollaboratorTerritoryInput,
  CompleteRegistrationInput,
  EditCollaboratorInput,
  RegisterCollaboratorInput,
  RehydrateCollaboratorInput,
} from './types.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isBlank = (s: string): boolean => s.trim().length === 0;

// Território (#42): UF do catálogo + município como NOME livre (texto da issue). UF inválida
// vira o slug `territory-uf-invalid` (a borda faz toErrorEnvelope(code, code)). Ausente ou
// ambos null → território null (backward-compatible). Município sem UF é permitido (texto livre).
const parseTerritory = (
  input: CollaboratorTerritoryInput | null,
): Result<CollaboratorTerritory | null, 'territory-uf-invalid'> => {
  if (input === null) return ok(null);
  const rawUf = input.uf ?? null;
  const rawMunicipality = input.municipality ?? null;
  if (rawUf === null && rawMunicipality === null) return ok(null);
  let uf: CollaboratorTerritory['uf'] = null;
  if (rawUf !== null) {
    const parsed = State.parse(rawUf);
    if (!parsed.ok) return err('territory-uf-invalid');
    uf = parsed.value;
  }
  return ok(immutable({ uf, municipality: rawMunicipality }));
};

export const register = (
  input: RegisterCollaboratorInput,
): Result<{ collaborator: ActiveCollaborator; event: CollaboratorEvent }, CollaboratorError> => {
  if (isBlank(input.name)) return err('collaborator-name-required');
  if (isBlank(input.email)) return err('collaborator-email-required');
  if (!EMAIL_RE.test(input.email.trim())) return err('collaborator-email-invalid');
  if (isBlank(input.role)) return err('collaborator-role-required');

  const cpf = Cpf.parse(input.cpf);
  if (!cpf.ok) return err('invalid-cpf');

  const occupationArea = OccupationArea.parse(input.occupationArea);
  if (!occupationArea.ok) return occupationArea;

  const employmentRelationship = EmploymentRelationship.parse(input.employmentRelationship);
  if (!employmentRelationship.ok) return employmentRelationship;

  // TERRITÓRIO (#42) e BANCÁRIO (#40) opcionais já no pré-cadastro (validados no domínio).
  const territory = parseTerritory(input.territory ?? null);
  if (!territory.ok) return territory;

  const bankAccountInput = input.bankAccount ?? null;
  let bankAccount: BankAccount | null = null;
  if (bankAccountInput !== null) {
    const r = PaymentTarget.createBankAccount(bankAccountInput);
    if (!r.ok) return err(r.error);
    bankAccount = r.value;
  }
  const pixKeyInput = input.pixKey ?? null;
  let pixKey: PixKey | null = null;
  if (pixKeyInput !== null) {
    const r = PaymentTarget.createPixKey(pixKeyInput);
    if (!r.ok) return err(r.error);
    pixKey = r.value;
  }

  const collaborator: ActiveCollaborator = immutable({
    id: input.id,
    name: input.name.trim(),
    email: input.email.trim(),
    cpf: cpf.value,
    occupationArea: occupationArea.value,
    role: input.role.trim(),
    startOfContract: input.startOfContract,
    employmentRelationship: employmentRelationship.value,
    registrationStatus: 'PreRegistration',
    rg: null,
    dateOfBirth: null,
    genderIdentity: null,
    race: null,
    education: null,
    foodCategory: null,
    foodCategoryDescription: null,
    completeAddress: null,
    telephone: null,
    emergencyContactName: null,
    emergencyContactTelephone: null,
    allergies: null,
    biography: null,
    experienceInThePublicSector: null,
    // PERFIL (#41) nasce vazio; preenchido no completeRegistration.
    sex: null,
    maritalStatus: null,
    hasChildren: null,
    childrenCount: null,
    childrenAges: null,
    isPwd: null,
    pwdDescription: null,
    isOnLeave: null,
    leaveDuration: null,
    leaveRenewable: null,
    leaveRenewalDuration: null,
    publicSectorExperienceDuration: null,
    // TERRITÓRIO (#42) e BANCÁRIO (#40) — entram já no pré-cadastro se fornecidos.
    territory: territory.value,
    bankAccount,
    pixKey,
    status: 'Active',
  });

  return ok({
    collaborator,
    event: {
      type: 'CollaboratorRegistered',
      collaboratorId: collaborator.id,
      occurredAt: input.registeredAt,
    },
  });
};

/**
 * Edição cadastral (PUT total): revalida os 7 campos cadastrais e os sobrescreve, **preservando**
 * via spread os campos pessoais, o `registrationStatus` e o estado de soft-delete (status/disableBy/
 * deactivatedAt). RBAC do campo vital (CPF) é decidido fora (use case/borda). Emite `CollaboratorEdited`.
 */
export const edit = (
  collaborator: Collaborator,
  input: EditCollaboratorInput,
  at: Date,
): Result<{ collaborator: Collaborator; event: CollaboratorEvent }, CollaboratorError> => {
  if (isBlank(input.name)) return err('collaborator-name-required');
  if (isBlank(input.email)) return err('collaborator-email-required');
  if (!EMAIL_RE.test(input.email.trim())) return err('collaborator-email-invalid');
  if (isBlank(input.role)) return err('collaborator-role-required');

  const cpf = Cpf.parse(input.cpf);
  if (!cpf.ok) return err('invalid-cpf');

  const occupationArea = OccupationArea.parse(input.occupationArea);
  if (!occupationArea.ok) return occupationArea;

  const employmentRelationship = EmploymentRelationship.parse(input.employmentRelationship);
  if (!employmentRelationship.ok) return employmentRelationship;

  // Spread preserva pessoais + registrationStatus + estado (Active/Inactive + disableBy/deactivatedAt).
  const edited: Collaborator = immutable({
    ...collaborator,
    name: input.name.trim(),
    email: input.email.trim(),
    cpf: cpf.value,
    occupationArea: occupationArea.value,
    role: input.role.trim(),
    startOfContract: input.startOfContract,
    employmentRelationship: employmentRelationship.value,
  });

  return ok({
    collaborator: edited,
    event: { type: 'CollaboratorEdited', collaboratorId: collaborator.id, occurredAt: at },
  });
};

export const completeRegistration = (
  collaborator: Collaborator,
  input: CompleteRegistrationInput,
  at: Date,
): Result<{ collaborator: Collaborator; event: CollaboratorEvent }, CollaboratorError> => {
  if (collaborator.registrationStatus === 'Complete') return err('collaborator-already-complete');

  const genderIdentity =
    input.genderIdentity === null ? ok(null) : GenderIdentity.parse(input.genderIdentity);
  if (!genderIdentity.ok) return genderIdentity;

  const race = input.race === null ? ok(null) : Race.parse(input.race);
  if (!race.ok) return race;

  const education = input.education === null ? ok(null) : Education.parse(input.education);
  if (!education.ok) return education;

  const foodCategory =
    input.foodCategory === null ? ok(null) : FoodCategory.parse(input.foodCategory);
  if (!foodCategory.ok) return foodCategory;

  // Campos novos podem chegar omitidos (undefined) em chamadas de domínio que não os passam;
  // normalizamos `undefined → null` (a borda HTTP já envia null por default).
  const sexRaw = input.sex ?? null;
  const maritalStatusRaw = input.maritalStatus ?? null;
  const territoryRaw = input.territory ?? null;
  const bankAccountRaw = input.bankAccount ?? null;
  const pixKeyRaw = input.pixKey ?? null;

  // PERFIL (#41): sexo + estado civil como VOs (slugs sex-invalid / marital-status-invalid).
  const sex = sexRaw === null ? ok(null) : Sex.parse(sexRaw);
  if (!sex.ok) return sex;

  const maritalStatus = maritalStatusRaw === null ? ok(null) : CivilStatus.parse(maritalStatusRaw);
  if (!maritalStatus.ok) return maritalStatus;

  // TERRITÓRIO (#42): UF validada pelo catálogo, remapeada para o slug territory-uf-invalid.
  const territory = parseTerritory(territoryRaw);
  if (!territory.ok) return territory;

  // BANCÁRIO (#40 lado Colaborador): destino de pagamento opcional (sem invariante "ao menos um").
  let bankAccount: BankAccount | null = null;
  if (bankAccountRaw !== null) {
    const r = PaymentTarget.createBankAccount(bankAccountRaw);
    if (!r.ok) return err(r.error);
    bankAccount = r.value;
  }
  let pixKey: PixKey | null = null;
  if (pixKeyRaw !== null) {
    const r = PaymentTarget.createPixKey(pixKeyRaw);
    if (!r.ok) return err(r.error);
    pixKey = r.value;
  }

  const completed: Collaborator = immutable({
    ...collaborator,
    registrationStatus: 'Complete',
    rg: input.rg,
    dateOfBirth: input.dateOfBirth,
    genderIdentity: genderIdentity.value,
    race: race.value,
    education: education.value,
    foodCategory: foodCategory.value,
    foodCategoryDescription: input.foodCategoryDescription,
    completeAddress: input.completeAddress,
    telephone: input.telephone,
    emergencyContactName: input.emergencyContactName,
    emergencyContactTelephone: input.emergencyContactTelephone,
    allergies: input.allergies,
    biography: input.biography,
    experienceInThePublicSector: input.experienceInThePublicSector,
    sex: sex.value,
    maritalStatus: maritalStatus.value,
    hasChildren: input.hasChildren ?? null,
    childrenCount: input.childrenCount ?? null,
    childrenAges: input.childrenAges ?? null,
    isPwd: input.isPwd ?? null,
    pwdDescription: input.pwdDescription ?? null,
    isOnLeave: input.isOnLeave ?? null,
    leaveDuration: input.leaveDuration ?? null,
    leaveRenewable: input.leaveRenewable ?? null,
    leaveRenewalDuration: input.leaveRenewalDuration ?? null,
    publicSectorExperienceDuration: input.publicSectorExperienceDuration ?? null,
    territory: territory.value,
    bankAccount,
    pixKey,
  });

  return ok({
    collaborator: completed,
    event: {
      type: 'CollaboratorRegistrationCompleted',
      collaboratorId: collaborator.id,
      occurredAt: at,
    },
  });
};

export const deactivate = (
  collaborator: Collaborator,
  disableByRaw: string,
  at: Date,
): Result<{ collaborator: Collaborator; event: CollaboratorEvent }, CollaboratorError> => {
  if (collaborator.status === 'Inactive') return err('collaborator-already-inactive');

  const disableBy = DisableReason.parse(disableByRaw);
  if (!disableBy.ok) return disableBy;

  const inactive: Collaborator = immutable({
    ...collaborator,
    status: 'Inactive',
    disableBy: disableBy.value,
    deactivatedAt: at,
  });

  return ok({
    collaborator: inactive,
    event: {
      type: 'CollaboratorDeactivated',
      collaboratorId: collaborator.id,
      disableBy: disableBy.value,
      occurredAt: at,
    },
  });
};

export const reactivate = (
  collaborator: Collaborator,
  at: Date,
): Result<{ collaborator: ActiveCollaborator; event: CollaboratorEvent }, CollaboratorError> => {
  if (collaborator.status === 'Active') return err('collaborator-already-active');

  const { disableBy: _disableBy, deactivatedAt: _deactivatedAt, ...core } = collaborator;
  const active: ActiveCollaborator = immutable({ ...core, status: 'Active' });

  return ok({
    collaborator: active,
    event: { type: 'CollaboratorReactivated', collaboratorId: collaborator.id, occurredAt: at },
  });
};

export const rehydrate = (
  input: RehydrateCollaboratorInput,
): Result<Collaborator, CollaboratorError> => {
  const { status, disableBy, deactivatedAt, ...core } = input;

  if (status === 'Active') {
    return ok(immutable({ ...core, status: 'Active' }));
  }

  if (disableBy === null || deactivatedAt === null) {
    return err('collaborator-inactive-requires-disable-reason');
  }
  return ok(immutable({ ...core, status: 'Inactive', disableBy, deactivatedAt }));
};
