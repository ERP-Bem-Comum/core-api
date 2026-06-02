/**
 * Serialização CSV da listagem de colaboradores. Achata o agregado `Collaborator` (discriminado por
 * `status`) em células planas; a mecânica de formato (escape RFC 4180, anti-fórmula, BOM) vem do
 * util compartilhado `#src/shared/utils/csv.ts`. Colunas em ordem fixa.
 *
 * Adapter de apresentação puro: sem port, sem use case, sem IO. Reusável por uma futura rota/CLI.
 */

import { toCsv } from '#src/shared/utils/csv.ts';
import type { Collaborator } from '../../domain/collaborator/types.ts';

const HEADER: readonly string[] = [
  'id',
  'name',
  'email',
  'cpf',
  'occupationArea',
  'role',
  'startOfContract',
  'employmentRelationship',
  'registrationStatus',
  'status',
  'rg',
  'dateOfBirth',
  'genderIdentity',
  'race',
  'education',
  'foodCategory',
  'foodCategoryDescription',
  'completeAddress',
  'telephone',
  'emergencyContactName',
  'emergencyContactTelephone',
  'allergies',
  'biography',
  'experienceInThePublicSector',
  'disableBy',
  'deactivatedAt',
];

const isoOrEmpty = (d: Date | null): string => (d === null ? '' : d.toISOString());
const boolOrEmpty = (b: boolean | null): string => (b === null ? '' : String(b));

// Achata o agregado em 26 células (ordem do HEADER). Campos pessoais nullable viram '' quando null.
// `disableBy`/`deactivatedAt` discriminados por `status` (só nos Inactive).
const collaboratorToCells = (c: Collaborator): readonly string[] => {
  const core = [
    c.id,
    c.name,
    c.email,
    String(c.cpf),
    c.occupationArea,
    c.role,
    c.startOfContract.toISOString(),
    c.employmentRelationship,
    c.registrationStatus,
    c.status,
  ];
  const personal = [
    c.rg ?? '',
    isoOrEmpty(c.dateOfBirth),
    c.genderIdentity ?? '',
    c.race ?? '',
    c.education ?? '',
    c.foodCategory ?? '',
    c.foodCategoryDescription ?? '',
    c.completeAddress ?? '',
    c.telephone ?? '',
    c.emergencyContactName ?? '',
    c.emergencyContactTelephone ?? '',
    c.allergies ?? '',
    c.biography ?? '',
    boolOrEmpty(c.experienceInThePublicSector),
  ];
  switch (c.status) {
    case 'Active':
      return [...core, ...personal, '', ''];
    case 'Inactive':
      return [...core, ...personal, c.disableBy, c.deactivatedAt.toISOString()];
  }
};

export const collaboratorsToCsv = (collaborators: readonly Collaborator[]): string =>
  toCsv(HEADER, collaborators.map(collaboratorToCells));
