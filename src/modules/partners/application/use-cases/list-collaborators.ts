/**
 * Query `listCollaborators` — lista colaboradores com filtro multifiltro opcional.
 *
 * Filtragem na camada de aplicação (predicado puro sobre `repo.list()`), não no port:
 * cardinalidade modesta (ADR-0031 sanciona varredura) + testável no gate default sem
 * tocar o adapter Drizzle. Quando houver volume, migrar para WHERE no repositório — a
 * assinatura de `CollaboratorListFilter` já fica pronta.
 *
 * Semântica: AND entre campos; OR dentro de cada array; campo ausente/array vazio = não restringe.
 */

import { type Result, ok } from '#src/shared/index.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import type { RegistrationStatus } from '#src/modules/partners/domain/collaborator/types.ts';
import type { OccupationArea } from '#src/modules/partners/domain/collaborator/occupation-area.ts';
import type { EmploymentRelationship } from '#src/modules/partners/domain/collaborator/employment-relationship.ts';
import type { GenderIdentity } from '#src/modules/partners/domain/collaborator/gender-identity.ts';
import type { Race } from '#src/modules/partners/domain/collaborator/race.ts';
import type { Education } from '#src/modules/partners/domain/collaborator/education.ts';
import type { DisableReason } from '#src/modules/partners/domain/collaborator/disable-reason.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';

export type CollaboratorListFilter = Readonly<{
  search?: string;
  statuses?: readonly Collaborator['status'][];
  registrationStatuses?: readonly RegistrationStatus[];
  occupationAreas?: readonly OccupationArea[];
  employmentRelationships?: readonly EmploymentRelationship[];
  // P1c — paridade legado (age adiado: depende de data de referência).
  genderIdentities?: readonly GenderIdentity[];
  races?: readonly Race[];
  educations?: readonly Education[];
  disableReasons?: readonly DisableReason[];
  roles?: readonly string[];
  yearOfContract?: number;
  // R3 — vínculo a Programa (ref leve UUID). OR dentro do array; colaborador sem vínculo
  // (programId null) nunca casa um filtro presente; ausente/vazio = não restringe.
  programIds?: readonly string[];
}>;

// `search` casa name (substring case-insensitive) OU cpf (só dígitos do termo). Termo
// vazio/sem dígitos não restringe o lado correspondente.
const matchesSearch = (c: Collaborator, search: string | undefined): boolean => {
  const q = search?.trim() ?? '';
  if (q === '') return true;
  if (c.name.toLowerCase().includes(q.toLowerCase())) return true;
  const digits = q.replace(/\D/g, '');
  return digits.length > 0 && String(c.cpf).includes(digits);
};

// Array ausente/vazio = não restringe; senão exige pertencimento.
const matchesIn = <T>(value: T, allowed: readonly T[] | undefined): boolean =>
  allowed === undefined || allowed.length === 0 || allowed.includes(value);

// Variante p/ campos nullable (pessoais/soft-delete): `null` nunca casa um filtro presente.
const matchesInNullable = <T>(value: T | null, allowed: readonly T[] | undefined): boolean =>
  allowed === undefined || allowed.length === 0 || (value !== null && allowed.includes(value));

const matchesYear = (startOfContract: Date, year: number | undefined): boolean =>
  year === undefined || startOfContract.getFullYear() === year;

export const collaboratorMatchesFilter = (
  c: Collaborator,
  filter: CollaboratorListFilter,
): boolean =>
  matchesSearch(c, filter.search) &&
  matchesIn(c.status, filter.statuses) &&
  matchesIn(c.registrationStatus, filter.registrationStatuses) &&
  matchesIn(c.occupationArea, filter.occupationAreas) &&
  matchesIn(c.employmentRelationship, filter.employmentRelationships) &&
  matchesInNullable(c.genderIdentity, filter.genderIdentities) &&
  matchesInNullable(c.race, filter.races) &&
  matchesInNullable(c.education, filter.educations) &&
  matchesInNullable(c.status === 'Inactive' ? c.disableBy : null, filter.disableReasons) &&
  matchesIn(c.role, filter.roles) &&
  matchesYear(c.startOfContract, filter.yearOfContract) &&
  matchesInNullable(c.programId, filter.programIds);

type Deps = Readonly<{ collaboratorRepo: CollaboratorRepository }>;

export const listCollaborators =
  (deps: Deps) =>
  async (
    filter: CollaboratorListFilter = {},
  ): Promise<Result<readonly Collaborator[], CollaboratorRepositoryError>> => {
    const listed = await deps.collaboratorRepo.list();
    if (!listed.ok) return listed;
    return ok(listed.value.filter((c) => collaboratorMatchesFilter(c, filter)));
  };
