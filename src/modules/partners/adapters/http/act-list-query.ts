/**
 * Composição de leitura/filtro de Acordos na borda. Predicado puro (search em
 * actNumber/corporateName/name + active + hasFinancialTransfer + occupationArea),
 * reusado pela lista e pelo export. Funções puras, sem IO.
 */

import type { ActReadRecord } from '#src/modules/partners/application/ports/act-reader.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';
import type { ActListQuery } from './act-schemas.ts';

export type ActExportFilter = Readonly<{
  search?: string;
  active?: boolean;
  hasFinancialTransfer?: boolean;
  occupationArea?: string;
}>;

export const queryToFilter = (
  q: Pick<ActListQuery, 'search' | 'active' | 'hasFinancialTransfer' | 'occupationArea'>,
): ActExportFilter => ({
  ...(q.search !== undefined ? { search: q.search } : {}),
  ...(q.active !== undefined ? { active: q.active === 1 } : {}),
  ...(q.hasFinancialTransfer !== undefined
    ? { hasFinancialTransfer: q.hasFinancialTransfer === 1 }
    : {}),
  ...(q.occupationArea !== undefined ? { occupationArea: q.occupationArea } : {}),
});

export const matchesFilter = (act: Act, filter: ActExportFilter): boolean => {
  if (filter.search !== undefined) {
    const needle = filter.search.toLowerCase();
    const hit =
      String(act.actNumber).toLowerCase().includes(needle) ||
      act.corporateName.toLowerCase().includes(needle) ||
      act.name.toLowerCase().includes(needle);
    if (!hit) return false;
  }
  if (filter.active !== undefined && (act.status === 'Active') !== filter.active) return false;
  if (
    filter.hasFinancialTransfer !== undefined &&
    act.hasFinancialTransfer !== filter.hasFinancialTransfer
  ) {
    return false;
  }
  if (filter.occupationArea !== undefined && act.occupationArea !== filter.occupationArea) {
    return false;
  }
  return true;
};

/** Export: filtra (sem paginar) e ordena por nome; devolve os agregados p/ `actsToCsv`. */
export const actsForExport = (
  records: readonly ActReadRecord[],
  filter: ActExportFilter,
): readonly Act[] =>
  records
    .filter((r) => matchesFilter(r.act, filter))
    .sort((a, b) => a.act.name.localeCompare(b.act.name))
    .map((r) => r.act);
