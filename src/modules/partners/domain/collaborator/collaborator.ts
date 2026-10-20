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
import * as PersonalData from './personal-data.ts';
import * as FoodCategory from './food-category.ts';
import * as Education from './education.ts';
import * as DisableReason from './disable-reason.ts';
import * as Sex from './sex.ts';
import * as MaritalStatus from './civil-status.ts';
import * as Territory from './territory.ts';
import * as PaymentTarget from '../shared/payment-target.ts';
import type {
  BankAccount,
  BankAccountInput,
  PaymentTargetError,
  PixKey,
  PixKeyInput,
} from '../shared/payment-target.ts';
import type { CollaboratorEvent } from './events.ts';
import type { CollaboratorError } from './errors.ts';
import type {
  ActiveCollaborator,
  Collaborator,
  CompleteRegistrationInput,
  EditCollaboratorInput,
  RegisterCollaboratorInput,
  RehydrateCollaboratorInput,
} from './types.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isBlank = (s: string): boolean => s.trim().length === 0;

// Banco/PIX opcionais (sem invariante "ao menos um"). Parseia os blocos presentes; null permanece null.
const parsePaymentTargets = (
  bankAccount: BankAccountInput | null,
  pixKey: PixKeyInput | null,
): Result<{ bankAccount: BankAccount | null; pixKey: PixKey | null }, PaymentTargetError> => {
  let bank: BankAccount | null = null;
  if (bankAccount !== null) {
    const r = PaymentTarget.createBankAccount(bankAccount);
    if (!r.ok) return r;
    bank = r.value;
  }
  let pix: PixKey | null = null;
  if (pixKey !== null) {
    const r = PaymentTarget.createPixKey(pixKey);
    if (!r.ok) return r;
    pix = r.value;
  }
  return ok({ bankAccount: bank, pixKey: pix });
};

// Edição (#1029): ausente/null mantém o VO atual; objeto valida (mesma regra da criação) e substitui.
const keepOrParse = <I, V>(
  current: V | null,
  input: I | null | undefined,
  parse: (raw: I) => Result<V, PaymentTargetError>,
): Result<V | null, PaymentTargetError> =>
  input === undefined || input === null ? ok(current) : parse(input);

// Edição do território (#1053) — território pode ser SUBSTITUÍDO, nunca APAGADO (decisão da P.O.):
//   - ausente/`null`                              → MANTÉM o gravado.
//   - objeto com ao menos um campo preenchido     → valida (mesma regra da criação) e SUBSTITUI;
//                                                    substituição parcial é permitida (ex.: trocar a
//                                                    UF e zerar o município).
//   - os dois vazios/brancos com território gravado → RECUSA (apagar não é suportado).
//   - os dois vazios/brancos sem território gravado → "mantém" (segue `null`).
const resolveTerritoryEdit = (
  current: Territory.Territory | null,
  input: Territory.TerritoryInput | null | undefined,
): Result<Territory.Territory | null, CollaboratorError> => {
  if (input === undefined || input === null) return ok(current);
  const ufBlank = input.uf === null || isBlank(input.uf);
  const municipalityBlank = input.municipality === null || isBlank(input.municipality);
  if (ufBlank && municipalityBlank) {
    return current === null ? ok(null) : err('collaborator-territory-removal-forbidden');
  }
  return Territory.createTerritory(input);
};

// RG, nascimento e raça (decisão da P.O., 19/10/2026: o gravado não muda, o que falta pode ser
// preenchido) e a normalização do dado pessoal vivem num ponto único — `personal-data.ts` (#1072).
// Todo comando que escreve esses campos passa por `resolveImmutablePersonalData`.

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

  const targets = parsePaymentTargets(input.bankAccount ?? null, input.pixKey ?? null);
  if (!targets.ok) return targets;

  const territoryInput = input.territory ?? null;
  const territory = territoryInput === null ? ok(null) : Territory.createTerritory(territoryInput);
  if (!territory.ok) return territory;

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
    bankAccount: targets.value.bankAccount,
    pixKey: targets.value.pixKey,
    territory: territory.value,
    rg: null,
    dateOfBirth: null,
    genderIdentity: null,
    genderIdentityDescription: null,
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
 * deactivatedAt). Banco/PIX (#1029): ausente ou `null` preserva; objeto valida e substitui — é o
 * caminho para preencher os migrados do legado, que vieram sem. Território (#1053): mesma semântica
 * de "preserva ou substitui", com a ressalva de que ESVAZIAR um território gravado é recusado (ver
 * `resolveTerritoryEdit`). RG, nascimento e raça: preenche o que falta, recusa trocar o gravado (ver
 * `PersonalData.resolveImmutablePersonalData`). RBAC do campo vital (CPF) é decidido fora (use
 * case/borda). Emite `CollaboratorEdited`.
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

  const bankAccount = keepOrParse(
    collaborator.bankAccount,
    input.bankAccount,
    PaymentTarget.createBankAccount,
  );
  if (!bankAccount.ok) return bankAccount;

  const pixKey = keepOrParse(collaborator.pixKey, input.pixKey, PaymentTarget.createPixKey);
  if (!pixKey.ok) return pixKey;

  const territory = resolveTerritoryEdit(collaborator.territory, input.territory);
  if (!territory.ok) return territory;

  const fixed = PersonalData.resolveImmutablePersonalData(collaborator, input, at);
  if (!fixed.ok) return fixed;

  // Spread preserva os demais pessoais + registrationStatus + estado (Active/Inactive + disableBy/deactivatedAt).
  const edited: Collaborator = immutable({
    ...collaborator,
    name: input.name.trim(),
    email: input.email.trim(),
    cpf: cpf.value,
    occupationArea: occupationArea.value,
    role: input.role.trim(),
    startOfContract: input.startOfContract,
    employmentRelationship: employmentRelationship.value,
    bankAccount: bankAccount.value,
    pixKey: pixKey.value,
    territory: territory.value,
    rg: fixed.value.rg,
    dateOfBirth: fixed.value.dateOfBirth,
    race: fixed.value.race,
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

  // #1054: o texto livre de "Outra identidade de gênero" só é coerente com genderIdentity = OUTRO.
  // O foodCategory não guarda o caso análogo (grava sem validar); a issue decidiu RECUSAR aqui,
  // alinhado ao ethos fail-fast do repo. OUTRO SEM descrição continua válido (o texto é opcional).
  // #1072: a guarda e a gravação enxergam o MESMO valor normalizado (trim, branco → null, limite).
  const genderIdentityDescription = PersonalData.parseGenderIdentityDescription(
    input.genderIdentityDescription,
  );
  if (!genderIdentityDescription.ok) return genderIdentityDescription;
  if (genderIdentityDescription.value !== null && genderIdentity.value !== 'OUTRO') {
    return err('gender-identity-description-requires-other');
  }

  // #1072: RG, nascimento e raça passam pelo mesmo "preenche uma vez" do `edit` — o PUT pode tê-los
  // gravado ainda em PreRegistration, e o autocadastro não pode apagá-los nem trocá-los.
  const fixed = PersonalData.resolveImmutablePersonalData(collaborator, input, at);
  if (!fixed.ok) return fixed;

  const education = input.education === null ? ok(null) : Education.parse(input.education);
  if (!education.ok) return education;

  const foodCategory =
    input.foodCategory === null ? ok(null) : FoodCategory.parse(input.foodCategory);
  if (!foodCategory.ok) return foodCategory;

  const sexRaw = input.sex ?? null;
  const sex = sexRaw === null ? ok(null) : Sex.parse(sexRaw);
  if (!sex.ok) return sex;

  const maritalRaw = input.maritalStatus ?? null;
  const maritalStatus = maritalRaw === null ? ok(null) : MaritalStatus.parse(maritalRaw);
  if (!maritalStatus.ok) return maritalStatus;

  // Coerência (US2): sem filhos ⇒ contagem/idades vazias.
  if (input.hasChildren === false) {
    const count = input.childrenCount ?? 0;
    const ages = input.childrenAges ?? [];
    if (count > 0 || ages.length > 0) return err('collaborator-children-inconsistent');
  }

  const completed: Collaborator = immutable({
    ...collaborator,
    registrationStatus: 'Complete',
    rg: fixed.value.rg,
    dateOfBirth: fixed.value.dateOfBirth,
    genderIdentity: genderIdentity.value,
    genderIdentityDescription: genderIdentityDescription.value,
    race: fixed.value.race,
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
