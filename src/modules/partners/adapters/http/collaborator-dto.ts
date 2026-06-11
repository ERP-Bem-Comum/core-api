/**
 * Mappers read-record → DTO HTTP. Serialização pura (sem I/O). Detalhe e item de lista
 * compartilham o mesmo shape (schema legado `Collaborator`).
 */

import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import type { CollaboratorDetailDto } from './schemas.ts';

const isoOrNull = (d: Date | null): string | null => (d === null ? null : d.toISOString());

/**
 * Detalhe espelhando o schema legado `Collaborator`. `status` recebe o `registrationStatus`;
 * `active` deriva do soft-delete (`status === 'Active'`); `disableBy` só existe em Inactive.
 */
export const collaboratorToDetailDto = (record: CollaboratorReadRecord): CollaboratorDetailDto => {
  const c = record.collaborator;
  return {
    id: String(c.id),
    legacyId: record.legacyId,
    name: c.name,
    email: c.email,
    cpf: String(c.cpf),
    rg: c.rg,
    occupationArea: c.occupationArea,
    role: c.role,
    startOfContract: c.startOfContract.toISOString(),
    dateOfBirth: isoOrNull(c.dateOfBirth),
    employmentRelationship: c.employmentRelationship,
    genderIdentity: c.genderIdentity,
    race: c.race,
    education: c.education,
    foodCategory: c.foodCategory,
    foodCategoryDescription: c.foodCategoryDescription,
    disableBy: c.status === 'Inactive' ? c.disableBy : null,
    status: c.registrationStatus,
    biography: c.biography,
    completeAddress: c.completeAddress,
    allergies: c.allergies,
    telephone: c.telephone,
    emergencyContactName: c.emergencyContactName,
    emergencyContactTelephone: c.emergencyContactTelephone,
    experienceInThePublicSector: c.experienceInThePublicSector,
    programId: c.programId,
    active: c.status === 'Active',
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
