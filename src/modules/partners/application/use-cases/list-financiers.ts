/**
 * Query `listFinanciers` — lista financiadores com filtro opcional. Filtro puro na application
 * (reusado pela borda HTTP — filtro/paginação transitórios, ADR-0032). AND entre campos.
 */

import { type Result, ok } from '#src/shared/index.ts';
import type { Financier } from '#src/modules/partners/domain/financier/types.ts';
import type {
  FinancierRepository,
  FinancierRepositoryError,
} from '#src/modules/partners/domain/financier/repository.ts';

export type FinancierListFilter = Readonly<{
  search?: string;
  active?: boolean;
}>;

// `search` casa name (substring case-insensitive) OU cnpj.
const matchesSearch = (f: Financier, search: string | undefined): boolean => {
  const q = search?.trim() ?? '';
  if (q === '') return true;
  if (f.name.toLowerCase().includes(q.toLowerCase())) return true;
  // ADR-0044: o CNPJ é alfanumérico. Remover só a MÁSCARA — tirar letras faria a busca pelo
  // CNPJ real não encontrar o cadastro. O VO guarda uppercase sem máscara.
  const term = q.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return term.length > 0 && String(f.cnpj).toUpperCase().includes(term);
};

export const financierMatchesFilter = (f: Financier, filter: FinancierListFilter): boolean => {
  if (!matchesSearch(f, filter.search)) return false;
  if (filter.active !== undefined && (f.status === 'Active') !== filter.active) return false;
  return true;
};

type Deps = Readonly<{ financierRepo: FinancierRepository }>;

export const listFinanciers =
  (deps: Deps) =>
  async (
    filter: FinancierListFilter = {},
  ): Promise<Result<readonly Financier[], FinancierRepositoryError>> => {
    const listed = await deps.financierRepo.list();
    if (!listed.ok) return listed;
    return ok(listed.value.filter((f) => financierMatchesFilter(f, filter)));
  };
