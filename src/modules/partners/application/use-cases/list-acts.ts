/**
 * Query `listActs` — lista Acordos com filtro multifiltro opcional.
 *
 * Filtragem na application (predicado puro sobre `repo.list()`) — cardinalidade modesta;
 * migrar para WHERE quando crescer. `actMatchesFilter` é reusada pela borda HTTP.
 * Semântica: AND entre campos. `search` casa actNumber/corporateName/name.
 */

import { type Result, ok } from '#src/shared/index.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';
import type {
  ActRepository,
  ActRepositoryError,
} from '#src/modules/partners/domain/act/repository.ts';

export type ActListFilter = Readonly<{
  search?: string;
  active?: boolean;
  hasFinancialTransfer?: boolean;
  // `string` cru da query; área inexistente simplesmente não casa nenhum acordo.
  occupationArea?: string;
}>;

// `search` casa actNumber, corporateName ou name (substring case-insensitive).
const matchesSearch = (a: Act, search: string | undefined): boolean => {
  const q = search?.trim().toLowerCase() ?? '';
  if (q === '') return true;
  return (
    String(a.actNumber).toLowerCase().includes(q) ||
    a.corporateName.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q)
  );
};

export const actMatchesFilter = (a: Act, filter: ActListFilter): boolean => {
  if (!matchesSearch(a, filter.search)) return false;
  if (filter.active !== undefined && (a.status === 'Active') !== filter.active) return false;
  if (
    filter.hasFinancialTransfer !== undefined &&
    a.hasFinancialTransfer !== filter.hasFinancialTransfer
  ) {
    return false;
  }
  if (filter.occupationArea !== undefined && a.occupationArea !== filter.occupationArea)
    return false;
  return true;
};

type Deps = Readonly<{ actRepo: ActRepository }>;

export const listActs =
  (deps: Deps) =>
  async (filter: ActListFilter = {}): Promise<Result<readonly Act[], ActRepositoryError>> => {
    const listed = await deps.actRepo.list();
    if (!listed.ok) return listed;
    return ok(listed.value.filter((a) => actMatchesFilter(a, filter)));
  };
