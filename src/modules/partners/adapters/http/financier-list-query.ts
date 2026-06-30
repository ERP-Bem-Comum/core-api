/**
 * Composição de leitura da lista de financiadores na borda (ADR-0032, transitório).
 * Mapeia query → `FinancierListFilter`, filtra (reusa `financierMatchesFilter`), ordena por
 * `name` e pagina. Espelha `supplier-list-query.ts`.
 */

import type { FinancierReadRecord } from '#src/modules/partners/application/ports/financier-reader.ts';
import type { Financier } from '#src/modules/partners/domain/financier/types.ts';
import {
  financierMatchesFilter,
  type FinancierListFilter,
} from '#src/modules/partners/application/use-cases/list-financiers.ts';
import type { FinancierListQuery } from './financier-schemas.ts';

export const queryToFilter = (q: FinancierListQuery): FinancierListFilter => ({
  ...(q.search !== undefined ? { search: q.search } : {}),
  ...(q.active !== undefined ? { active: q.active === 1 } : {}),
});

/** Export: filtra (sem paginar) e ordena por nome; devolve os agregados p/ `financiersToCsv`. */
export const financiersForExport = (
  records: readonly FinancierReadRecord[],
  filter: FinancierListFilter,
): readonly Financier[] =>
  records
    .filter((r) => financierMatchesFilter(r.financier, filter))
    .sort((a, b) => a.financier.name.localeCompare(b.financier.name))
    .map((r) => r.financier);

export type PaginationMeta = Readonly<{
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}>;

export type PaginatedRecords = Readonly<{
  items: readonly FinancierReadRecord[];
  meta: PaginationMeta;
}>;

export const paginateRecords = (
  records: readonly FinancierReadRecord[],
  filter: FinancierListFilter,
  query: Pick<FinancierListQuery, 'page' | 'limit' | 'order'>,
): PaginatedRecords => {
  const filtered = records.filter((r) => financierMatchesFilter(r.financier, filter));
  const direction = query.order === 'DESC' ? -1 : 1;
  const sorted = [...filtered].sort(
    (a, b) => a.financier.name.localeCompare(b.financier.name) * direction,
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
