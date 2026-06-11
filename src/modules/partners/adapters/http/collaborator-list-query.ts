/**
 * Composição de leitura da lista de colaboradores na borda (ADR-0032, transitório até o BFF).
 *
 * Mapeia a query HTTP → `CollaboratorListFilter` do domínio (reuso de `collaboratorMatchesFilter`),
 * filtra os read-records, ordena por `name` e pagina (slice). Funções puras — sem I/O.
 *
 * Mapeamento legado: `status` (query) = `registrationStatus`; `active` (0|1) = soft-delete
 * (`Inactive`|`Active`). Volume modesto sanciona a varredura em memória (ADR-0031); quando
 * crescer, migrar para WHERE/paginação no repositório.
 */

import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import {
  collaboratorMatchesFilter,
  type CollaboratorListFilter,
} from '#src/modules/partners/application/use-cases/list-collaborators.ts';
import type { CollaboratorListQuery } from './schemas.ts';

/** Export: filtra (sem paginar) e ordena por nome; devolve os agregados p/ `collaboratorsToCsv`. */
export const collaboratorsForExport = (
  records: readonly CollaboratorReadRecord[],
  filter: CollaboratorListFilter,
): readonly Collaborator[] =>
  records
    .filter((r) => collaboratorMatchesFilter(r.collaborator, filter))
    .sort((a, b) => a.collaborator.name.localeCompare(b.collaborator.name))
    .map((r) => r.collaborator);

export const queryToFilter = (q: CollaboratorListQuery): CollaboratorListFilter => ({
  ...(q.search !== undefined ? { search: q.search } : {}),
  ...(q.status !== undefined ? { registrationStatuses: q.status } : {}),
  ...(q.active !== undefined ? { statuses: q.active === 1 ? ['Active'] : ['Inactive'] } : {}),
  ...(q.occupationAreas !== undefined ? { occupationAreas: q.occupationAreas } : {}),
  ...(q.employmentRelationships !== undefined
    ? { employmentRelationships: q.employmentRelationships }
    : {}),
  ...(q.genderIdentities !== undefined ? { genderIdentities: q.genderIdentities } : {}),
  ...(q.breeds !== undefined ? { races: q.breeds } : {}),
  ...(q.educations !== undefined ? { educations: q.educations } : {}),
  ...(q.disableBy !== undefined ? { disableReasons: q.disableBy } : {}),
  ...(q.roles !== undefined ? { roles: q.roles } : {}),
  ...(q.yearOfContract !== undefined ? { yearOfContract: q.yearOfContract } : {}),
  ...(q.programIds !== undefined ? { programIds: q.programIds } : {}),
});

export type PaginationMeta = Readonly<{
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}>;

export type PaginatedRecords = Readonly<{
  items: readonly CollaboratorReadRecord[];
  meta: PaginationMeta;
}>;

export const paginateRecords = (
  records: readonly CollaboratorReadRecord[],
  filter: CollaboratorListFilter,
  query: Pick<CollaboratorListQuery, 'page' | 'limit' | 'order'>,
): PaginatedRecords => {
  const filtered = records.filter((r) => collaboratorMatchesFilter(r.collaborator, filter));
  const direction = query.order === 'DESC' ? -1 : 1;
  const sorted = [...filtered].sort(
    (a, b) => a.collaborator.name.localeCompare(b.collaborator.name) * direction,
  );
  const totalItems = sorted.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit);
  const start = (query.page - 1) * query.limit;
  const items = sorted.slice(start, start + query.limit);
  return {
    items,
    meta: {
      itemCount: items.length,
      totalItems,
      itemsPerPage: query.limit,
      totalPages,
      currentPage: query.page,
    },
  };
};
