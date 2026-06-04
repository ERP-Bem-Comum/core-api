/**
 * Composição de leitura da lista de fornecedores na borda (ADR-0032, transitório).
 * Mapeia a query → `SupplierListFilter`, filtra (reusa `supplierMatchesFilter`), ordena por
 * `name` e pagina. Funções puras. Espelha `collaborator-list-query.ts`.
 */

import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import {
  supplierMatchesFilter,
  type SupplierListFilter,
} from '#src/modules/partners/application/use-cases/list-suppliers.ts';
import type { SupplierListQuery } from './supplier-schemas.ts';

export const queryToFilter = (q: SupplierListQuery): SupplierListFilter => ({
  ...(q.search !== undefined ? { search: q.search } : {}),
  ...(q.active !== undefined ? { active: q.active === 1 } : {}),
  ...(q.categories !== undefined ? { categories: q.categories } : {}),
});

export type PaginationMeta = Readonly<{
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}>;

export type PaginatedRecords = Readonly<{
  items: readonly SupplierReadRecord[];
  meta: PaginationMeta;
}>;

export const paginateRecords = (
  records: readonly SupplierReadRecord[],
  filter: SupplierListFilter,
  query: Pick<SupplierListQuery, 'page' | 'limit' | 'order'>,
): PaginatedRecords => {
  const filtered = records.filter((r) => supplierMatchesFilter(r.supplier, filter));
  const direction = query.order === 'DESC' ? -1 : 1;
  const sorted = [...filtered].sort(
    (a, b) => a.supplier.name.localeCompare(b.supplier.name) * direction,
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
