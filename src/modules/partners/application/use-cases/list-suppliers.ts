/**
 * Query `listSuppliers` — lista fornecedores com filtro multifiltro opcional.
 *
 * Filtragem na application (predicado puro sobre `repo.list()`) — cardinalidade modesta
 * (ADR-0031); migrar para WHERE quando crescer. `supplierMatchesFilter` é reusada pela borda
 * HTTP (paginação/filtro transitórios, ADR-0032). Semântica: AND entre campos; OR dentro do array.
 */

import { type Result, ok } from '#src/shared/index.ts';
import { companyNamesOf, documentOf } from '#src/modules/partners/domain/supplier/supplier.ts';
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

// Nomes pesquisáveis do fornecedor. #288: apelido = fantasyName; razão social = corporateName —
// que só a PJ tem (#1022).
const searchableNames = (s: Supplier): readonly string[] => {
  const names = companyNamesOf(s.identity);
  return names === null ? [s.name] : [s.name, names.fantasyName, names.corporateName];
};

// `search` casa os nomes (substring case-insensitive) OU o documento (CPF ou CNPJ).
const matchesSearch = (s: Supplier, search: string | undefined): boolean => {
  const q = search?.trim() ?? '';
  if (q === '') return true;
  const term = q.toLowerCase();
  if (searchableNames(s).some((name) => name.toLowerCase().includes(term))) return true;
  // ADR-0044: o CNPJ é alfanumérico. Remover só a MÁSCARA — tirar letras faria a busca pelo
  // CNPJ real não encontrar o cadastro. O VO guarda uppercase sem máscara; o do CPF é numérico.
  const documentTerm = q.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return documentTerm.length > 0 && documentOf(s).includes(documentTerm);
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
