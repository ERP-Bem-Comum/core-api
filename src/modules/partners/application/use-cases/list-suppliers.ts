/**
 * Query `listSuppliers` — lista fornecedores com filtro multifiltro opcional.
 *
 * Filtragem na application (predicado puro sobre `repo.list()`) — cardinalidade modesta
 * (ADR-0031); migrar para WHERE quando crescer. `supplierMatchesFilter` é reusada pela borda
 * HTTP (paginação/filtro transitórios, ADR-0032). Semântica: AND entre campos; OR dentro do array.
 */

import { type Result, ok } from '#src/shared/index.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';

export type SupplierListFilter = Readonly<{
  search?: string;
  active?: boolean;
  // `string[]` (não `ServiceCategory[]`): a borda passa valores crus da query; categoria
  // inexistente simplesmente não casa nenhum fornecedor (filtra-se nada).
  categories?: readonly string[];
}>;

// `search` casa name (substring case-insensitive) OU cnpj (só dígitos do termo).
const matchesSearch = (s: Supplier, search: string | undefined): boolean => {
  const q = search?.trim() ?? '';
  if (q === '') return true;
  if (s.name.toLowerCase().includes(q.toLowerCase())) return true;
  const digits = q.replace(/\D/g, '');
  return digits.length > 0 && String(s.cnpj).includes(digits);
};

export const supplierMatchesFilter = (s: Supplier, filter: SupplierListFilter): boolean => {
  if (!matchesSearch(s, filter.search)) return false;
  if (filter.active !== undefined && (s.status === 'Active') !== filter.active) return false;
  if (
    filter.categories !== undefined &&
    filter.categories.length > 0 &&
    !filter.categories.includes(s.serviceCategory)
  ) {
    return false;
  }
  return true;
};

type Deps = Readonly<{ supplierRepo: SupplierRepository }>;

export const listSuppliers =
  (deps: Deps) =>
  async (
    filter: SupplierListFilter = {},
  ): Promise<Result<readonly Supplier[], SupplierRepositoryError>> => {
    const listed = await deps.supplierRepo.list();
    if (!listed.ok) return listed;
    return ok(listed.value.filter((s) => supplierMatchesFilter(s, filter)));
  };
