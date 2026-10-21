/**
 * Mapper ETL: linha legada `collaborators` → agregado `Collaborator`.
 *
 * Enums literais (ADR-0031 §D2 — quarentena se fora do Set); `status` legado
 * PRE_CADASTRO/CADASTRO_COMPLETO → registrationStatus PreRegistration/Complete.
 * D10: inativo sem `disableBy` → backfill `LEGACY_MIGRATION` (+ deactivatedAt=updatedAt).
 * D13: `biography`>2000 / `telephone`>30 / `rg`>20 → Overflow (nunca trunca). O `rg` passa antes
 * pela normalização do domínio (#1072): trim, branco → null.
 */

import { type Result, ok, err, combine, mapErr } from '#src/shared/primitives/result.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as OccupationArea from '#src/modules/partners/domain/collaborator/occupation-area.ts';
import * as EmploymentRelationship from '#src/modules/partners/domain/collaborator/employment-relationship.ts';
import * as GenderIdentity from '#src/modules/partners/domain/collaborator/gender-identity.ts';
import * as Race from '#src/modules/partners/domain/collaborator/race.ts';
import * as Education from '#src/modules/partners/domain/collaborator/education.ts';
import * as FoodCategory from '#src/modules/partners/domain/collaborator/food-category.ts';
import * as DisableReason from '#src/modules/partners/domain/collaborator/disable-reason.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as PersonalData from '#src/modules/partners/domain/collaborator/personal-data.ts';
import type {
  Collaborator as CollaboratorEntity,
  RegistrationStatus,
} from '#src/modules/partners/domain/collaborator/types.ts';
import type { LegacyCollaboratorRow } from '../legacy/rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import {
  type MapperResult,
  requireField,
  requireEmail,
  parseCpfField,
  parseEnumField,
  parseNullableEnumField,
  checkOverflowNullable,
  statusFromActive,
} from './shared.ts';

const mapRegistrationStatus = (raw: string): Result<RegistrationStatus, QuarantineReason> => {
  if (raw === 'PRE_CADASTRO') return ok('PreRegistration');
  if (raw === 'CADASTRO_COMPLETO') return ok('Complete');
  return err({ tag: 'EnumUnknown', field: 'status', attempted: raw });
};

const requireRole = (raw: string | null): Result<string, QuarantineReason> =>
  raw === null ? err({ tag: 'RequiredFieldMissing', field: 'role' }) : requireField(raw, 'role');

// #1072: o RG segue a MESMA normalização do domínio (`PersonalData.parseRg`): trim, branco → null.
// Gravado como `''`, ele travava o "preenche uma vez" do PUT (409 eterno). Acima da coluna
// varchar(20) vira `Overflow` (D13: nunca trunca). O agregado entra por `rehydrate`, que não
// revalida — por isso a normalização mora aqui.
// `null` é tratado antes: só um RG presente pode estourar, e o `attempted` é ele mesmo.
const normalizeRg = (raw: string | null): Result<string | null, QuarantineReason> =>
  raw === null
    ? ok(null)
    : mapErr(
        PersonalData.parseRg(raw),
        (): QuarantineReason => ({
          tag: 'Overflow',
          field: 'rg',
          attempted: raw,
          maxLength: PersonalData.RG_MAX_LENGTH,
        }),
      );

// D10: active=1 → null. active=0 → motivo legado válido OU backfill LEGACY_MIGRATION.
const resolveDisableBy = (
  active: number,
  raw: string | null,
): DisableReason.DisableReason | null => {
  if (active === 1) return null;
  if (raw !== null) {
    const parsed = DisableReason.parse(raw);
    if (parsed.ok) return parsed.value;
  }
  return 'LEGACY_MIGRATION';
};

export const mapLegacyCollaboratorRow = (
  row: LegacyCollaboratorRow,
): MapperResult<CollaboratorEntity> => {
  const required = combine<
    readonly [
      string,
      string,
      Cpf,
      OccupationArea.OccupationArea,
      string,
      EmploymentRelationship.EmploymentRelationship,
      RegistrationStatus,
    ],
    QuarantineReason
  >([
    requireField(row.name, 'name'),
    requireEmail(row.email, 'email'),
    parseCpfField(row.cpf, 'cpf'),
    parseEnumField(OccupationArea.parse, row.occupationArea, 'occupation_area'),
    requireRole(row.role),
    parseEnumField(
      EmploymentRelationship.parse,
      row.employmentRelationship,
      'employment_relationship',
    ),
    mapRegistrationStatus(row.status),
  ]);

  const optionals = combine<
    readonly [
      GenderIdentity.GenderIdentity | null,
      Race.Race | null,
      Education.Education | null,
      FoodCategory.FoodCategory | null,
      string | null,
      string | null,
      string | null,
    ],
    QuarantineReason
  >([
    parseNullableEnumField(GenderIdentity.parse, row.genderIdentity, 'gender_identity'),
    parseNullableEnumField(Race.parse, row.race, 'race'),
    parseNullableEnumField(Education.parse, row.education, 'education'),
    parseNullableEnumField(FoodCategory.parse, row.foodCategory, 'food_category'),
    checkOverflowNullable(row.biography, 'biography', 2000),
    checkOverflowNullable(row.telephone, 'telephone', 30),
    normalizeRg(row.rg),
  ]);

  if (!required.ok || !optionals.ok) {
    return err([...(required.ok ? [] : required.error), ...(optionals.ok ? [] : optionals.error)]);
  }

  const [name, email, cpf, occupationArea, role, employmentRelationship, registrationStatus] =
    required.value;
  const [genderIdentity, race, education, foodCategory, biography, telephone, rg] = optionals.value;

  const status = statusFromActive(row.active);
  const disableBy = resolveDisableBy(row.active, row.disableBy);
  const deactivatedAt = status === 'Inactive' ? row.updatedAt : null;

  const rehydrated = Collaborator.rehydrate({
    id: CollaboratorId.generate(),
    name,
    email,
    cpf,
    occupationArea,
    role,
    startOfContract: row.startOfContract,
    employmentRelationship,
    registrationStatus,
    bankAccount: null,
    pixKey: null,
    territory: null,
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
    rg,
    dateOfBirth: row.dateOfBirth,
    genderIdentity,
    // #1054: o legado não tem coluna de "Outra identidade de gênero"; nasce null no core.
    genderIdentityDescription: null,
    race,
    education,
    foodCategory,
    foodCategoryDescription: row.foodCategoryDescription,
    completeAddress: row.completeAddress,
    telephone,
    emergencyContactName: row.emergencyContactName,
    emergencyContactTelephone: row.emergencyContactTelephone,
    allergies: row.allergies,
    biography,
    experienceInThePublicSector:
      row.experienceInThePublicSector === null ? null : row.experienceInThePublicSector === 1,
    status,
    disableBy,
    deactivatedAt,
  });
  if (!rehydrated.ok) return err([{ tag: 'RequiredFieldMissing', field: 'disable_by' }]);

  return ok({ aggregate: rehydrated.value, legacyId: row.id });
};
