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
