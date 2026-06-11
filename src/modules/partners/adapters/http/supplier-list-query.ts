/**
 * Composição de leitura da lista de fornecedores na borda (ADR-0032, transitório).
 * Mapeia a query → `SupplierListFilter`, filtra (reusa `supplierMatchesFilter`), ordena por
 * `name` e pagina. Funções puras. Espelha `collaborator-list-query.ts`.
 */

import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type {
  ContractCountReadPort,
  ContractStatus,
} from '#src/modules/contracts/public-api/index.ts';
import {
  supplierMatchesFilter,
  type SupplierListFilter,
} from '#src/modules/partners/application/use-cases/list-suppliers.ts';
import type { ContractStatusFilter, SupplierListQuery } from './supplier-schemas.ts';

/**
 * Resolve o filtro `contractStatus` (FR-006) em um conjunto de ids permitidos (010-partner-
 * contract-counts). Um estado de contrato → `contractorIdsWithContractStatus`; `none` → complemento
 * de `contractorIdsWithAnyContract`. Falha do port → conjunto vazio (filtro não resolvido restringe
 * a nada — não vaza fornecedores que poderiam não casar). `undefined` ⇒ não filtra.
 */
export const resolveContractStatusFilter = async (
  port: ContractCountReadPort,
  filter: ContractStatusFilter,
  candidateIds: readonly string[],
): Promise<ReadonlySet<string>> => {
  if (filter === 'none') {
    const r = await port.contractorIdsWithAnyContract('supplier');
    if (!r.ok) return new Set();
    const withContract = r.value;
    return new Set(candidateIds.filter((id) => !withContract.has(id)));
  }
  // `filter` é um ContractStatus (o enum do schema é superset { …status, 'none' }).
  const r = await port.contractorIdsWithContractStatus('supplier', filter satisfies ContractStatus);
  if (!r.ok) return new Set();
  return r.value;
};

// Aceita qualquer query que carregue os 3 campos de filtro (lista e export).
export const queryToFilter = (
  q: Pick<SupplierListQuery, 'search' | 'active' | 'categories'>,
): SupplierListFilter => ({
  ...(q.search !== undefined ? { search: q.search } : {}),
  ...(q.active !== undefined ? { active: q.active === 1 } : {}),
  ...(q.categories !== undefined ? { categories: q.categories } : {}),
});

/** Export (US-003): filtra (sem paginar) e ordena por nome; devolve os agregados p/ `suppliersToCsv`. */
export const suppliersForExport = (
  records: readonly SupplierReadRecord[],
  filter: SupplierListFilter,
): readonly Supplier[] =>
  records
    .filter((r) => supplierMatchesFilter(r.supplier, filter))
    .sort((a, b) => a.supplier.name.localeCompare(b.supplier.name))
    .map((r) => r.supplier);

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
