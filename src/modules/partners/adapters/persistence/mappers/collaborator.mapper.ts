// Mapper Collaborator: row MySQL ↔ agregado Collaborator (módulo partners).
//
//   - collaboratorToInsert(c, now): NewCollaboratorRow — enums/pessoais achatados em
//     colunas; active/deactivated_at/disable_by derivados do soft-delete; `now` injetado.
//   - collaboratorFromRow(row): Result<Collaborator, CollaboratorMapperError> — reidrata
//     id/cpf/enums (nullable) na borda, valida registration_status, delega a
//     Collaborator.rehydrate (reaplica coerência registro × soft-delete).
//
// ADR-0020: enums são varchar (sem ENUM nativo). ADR-0014: só par_*. Zero throw na borda.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as OccupationArea from '#src/modules/partners/domain/collaborator/occupation-area.ts';
import * as EmploymentRelationship from '#src/modules/partners/domain/collaborator/employment-relationship.ts';
import * as GenderIdentity from '#src/modules/partners/domain/collaborator/gender-identity.ts';
import * as Race from '#src/modules/partners/domain/collaborator/race.ts';
import * as Education from '#src/modules/partners/domain/collaborator/education.ts';
import * as FoodCategory from '#src/modules/partners/domain/collaborator/food-category.ts';
import * as DisableReason from '#src/modules/partners/domain/collaborator/disable-reason.ts';
import * as Sex from '#src/modules/partners/domain/collaborator/sex.ts';
import * as MaritalStatus from '#src/modules/partners/domain/collaborator/civil-status.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as PaymentTarget from '#src/modules/partners/domain/shared/payment-target.ts';
import type { BankAccount, PixKey } from '#src/modules/partners/domain/shared/payment-target.ts';
import type {
  Collaborator as CollaboratorEntity,
  RegistrationStatus,
} from '#src/modules/partners/domain/collaborator/types.ts';
import type { CollaboratorRow, NewCollaboratorRow } from '../schemas/mysql.ts';

export type CollaboratorMapperError =
  | 'collaborator-mapper-invalid-id'
  | 'collaborator-mapper-invalid-cpf'
  | 'collaborator-mapper-invalid-enum'
  | 'collaborator-mapper-invalid-payment-target'
  | 'collaborator-mapper-invalid-state';

const REGISTRATION_STATUSES: ReadonlySet<string> = new Set<RegistrationStatus>([
  'PreRegistration',
  'Complete',
]);

type ParseFn<T> = (raw: string) => Result<T, string>;

// Enum opcional: ausência (null) é válida; presença inválida → erro do mapper.
const parseNullable = <T>(
  raw: string | null,
  parse: ParseFn<T>,
): Result<T | null, 'enum-invalid'> => {
  if (raw === null) return ok(null);
  const r = parse(raw);
  return r.ok ? ok(r.value) : err('enum-invalid');
};

export const collaboratorToInsert = (c: CollaboratorEntity, now: Date): NewCollaboratorRow => ({
  id: c.id as unknown as string,
  name: c.name,
  email: c.email,
  cpf: c.cpf as unknown as string,
  occupationArea: c.occupationArea,
  role: c.role,
  startOfContract: c.startOfContract,
  employmentRelationship: c.employmentRelationship,
  registrationStatus: c.registrationStatus,
  rg: c.rg,
  dateOfBirth: c.dateOfBirth,
  genderIdentity: c.genderIdentity,
  race: c.race,
  education: c.education,
  foodCategory: c.foodCategory,
  foodCategoryDescription: c.foodCategoryDescription,
  completeAddress: c.completeAddress,
  telephone: c.telephone,
  emergencyContactName: c.emergencyContactName,
  emergencyContactTelephone: c.emergencyContactTelephone,
  allergies: c.allergies,
  biography: c.biography,
  experienceInThePublicSector: c.experienceInThePublicSector,
  sex: c.sex,
  maritalStatus: c.maritalStatus,
  hasChildren: c.hasChildren,
  childrenCount: c.childrenCount,
  childrenAges: c.childrenAges === null ? null : c.childrenAges.join(','),
  isPwd: c.isPwd,
  pwdDescription: c.pwdDescription,
  isOnLeave: c.isOnLeave,
  leaveDuration: c.leaveDuration,
  leaveRenewable: c.leaveRenewable,
  leaveRenewalDuration: c.leaveRenewalDuration,
  publicSectorExperienceDuration: c.publicSectorExperienceDuration,
  bankAccountBank: c.bankAccount?.bank ?? null,
  bankAccountAgency: c.bankAccount?.agency ?? null,
  bankAccountNumber: c.bankAccount?.accountNumber ?? null,
  bankAccountCheckDigit: c.bankAccount?.checkDigit ?? null,
  pixKeyType: c.pixKey?.keyType ?? null,
  pixKey: c.pixKey?.key ?? null,
  active: c.status === 'Active',
  disableBy: c.status === 'Inactive' ? c.disableBy : null,
  deactivatedAt: c.status === 'Inactive' ? c.deactivatedAt : null,
  createdAt: now,
  updatedAt: now,
});

// Reconstrói BankAccount/PixKey da row. Ausência total → ok(null). Erro de VO → err.
const bankFromRow = (
  row: Readonly<CollaboratorRow>,
): Result<BankAccount | null, 'collaborator-mapper-invalid-payment-target'> => {
  if (row.bankAccountBank === null) return ok(null);
  const r = PaymentTarget.createBankAccount({
    bank: row.bankAccountBank,
    agency: row.bankAccountAgency ?? '',
    accountNumber: row.bankAccountNumber ?? '',
    checkDigit: row.bankAccountCheckDigit ?? '',
  });
  return r.ok ? { ok: true, value: r.value } : err('collaborator-mapper-invalid-payment-target');
};

const pixFromRow = (
  row: Readonly<CollaboratorRow>,
): Result<PixKey | null, 'collaborator-mapper-invalid-payment-target'> => {
  if (row.pixKey === null) return ok(null);
  const r = PaymentTarget.createPixKey({ keyType: row.pixKeyType ?? '', key: row.pixKey });
  return r.ok ? { ok: true, value: r.value } : err('collaborator-mapper-invalid-payment-target');
};

// childrenAges persistido como CSV (`5,8,12`). Vazio/null → null; ignora tokens não-numéricos.
const parseChildrenAges = (raw: string | null): readonly number[] | null => {
  if (raw === null || raw.trim() === '') return null;
  const parsed = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return parsed.length > 0 ? parsed : null;
};

export const collaboratorFromRow = (
  row: Readonly<CollaboratorRow>,
): Result<CollaboratorEntity, CollaboratorMapperError> => {
  const id = CollaboratorId.rehydrate(row.id);
  if (!id.ok) return err('collaborator-mapper-invalid-id');

  const cpf = Cpf.parse(row.cpf);
  if (!cpf.ok) return err('collaborator-mapper-invalid-cpf');

  const occupationArea = OccupationArea.parse(row.occupationArea);
  if (!occupationArea.ok) return err('collaborator-mapper-invalid-enum');

  const employmentRelationship = EmploymentRelationship.parse(row.employmentRelationship);
  if (!employmentRelationship.ok) return err('collaborator-mapper-invalid-enum');

  if (!REGISTRATION_STATUSES.has(row.registrationStatus)) {
    return err('collaborator-mapper-invalid-state');
  }

  const genderIdentity = parseNullable(row.genderIdentity, GenderIdentity.parse);
  if (!genderIdentity.ok) return err('collaborator-mapper-invalid-enum');

  const race = parseNullable(row.race, Race.parse);
  if (!race.ok) return err('collaborator-mapper-invalid-enum');

  const education = parseNullable(row.education, Education.parse);
  if (!education.ok) return err('collaborator-mapper-invalid-enum');

  const foodCategory = parseNullable(row.foodCategory, FoodCategory.parse);
  if (!foodCategory.ok) return err('collaborator-mapper-invalid-enum');

  const disableBy = parseNullable(row.disableBy, DisableReason.parse);
  if (!disableBy.ok) return err('collaborator-mapper-invalid-enum');

  const bank = bankFromRow(row);
  if (!bank.ok) return bank;

  const pix = pixFromRow(row);
  if (!pix.ok) return pix;

  const sex = parseNullable(row.sex, Sex.parse);
  if (!sex.ok) return err('collaborator-mapper-invalid-enum');

  const maritalStatus = parseNullable(row.maritalStatus, MaritalStatus.parse);
  if (!maritalStatus.ok) return err('collaborator-mapper-invalid-enum');

  const rehydrated = Collaborator.rehydrate({
    id: id.value,
    name: row.name,
    email: row.email,
    cpf: cpf.value,
    occupationArea: occupationArea.value,
    role: row.role,
    startOfContract: row.startOfContract,
    employmentRelationship: employmentRelationship.value,
    registrationStatus: row.registrationStatus as RegistrationStatus,
    bankAccount: bank.value,
    pixKey: pix.value,
    rg: row.rg,
    dateOfBirth: row.dateOfBirth,
    genderIdentity: genderIdentity.value,
    race: race.value,
    education: education.value,
    foodCategory: foodCategory.value,
    foodCategoryDescription: row.foodCategoryDescription,
    completeAddress: row.completeAddress,
    telephone: row.telephone,
    emergencyContactName: row.emergencyContactName,
    emergencyContactTelephone: row.emergencyContactTelephone,
    allergies: row.allergies,
    biography: row.biography,
    experienceInThePublicSector: row.experienceInThePublicSector,
    sex: sex.value,
    maritalStatus: maritalStatus.value,
    hasChildren: row.hasChildren,
    childrenCount: row.childrenCount,
    childrenAges: parseChildrenAges(row.childrenAges),
    isPwd: row.isPwd,
    pwdDescription: row.pwdDescription,
    isOnLeave: row.isOnLeave,
    leaveDuration: row.leaveDuration,
    leaveRenewable: row.leaveRenewable,
    leaveRenewalDuration: row.leaveRenewalDuration,
    publicSectorExperienceDuration: row.publicSectorExperienceDuration,
    status: row.active ? 'Active' : 'Inactive',
    disableBy: disableBy.value,
    deactivatedAt: row.deactivatedAt,
  });
  if (!rehydrated.ok) return err('collaborator-mapper-invalid-state');
  return rehydrated;
};
