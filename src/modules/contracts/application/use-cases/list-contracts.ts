import type { Result } from '../../../../shared/primitives/result.ts';
import { ok } from '../../../../shared/primitives/result.ts';
import type { Contract } from '../../domain/contract/types.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
  ListContractsQuery,
} from '../../domain/contract/repository.ts';

type Deps = Readonly<{ contractRepo: ContractRepository }>;

/** Metadados de paginação devolvidos ao chamador (borda HTTP / CLI). */
export type ListContractsMeta = Readonly<{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}>;

export type ListContractsResult = Readonly<{
  items: readonly Contract[];
  meta: ListContractsMeta;
}>;

// CTR-HTTP-CONTRACT-LIST-FILTERS — listagem filtrada/paginada. A query (já
// validada na borda Zod) é repassada ao repositório, que filtra/ordena/pagina
// no banco. O use case apenas deriva `totalPages = ceil(total/limit)`.
export const listContracts =
  (deps: Deps) =>
  async (
    query: ListContractsQuery,
  ): Promise<Result<ListContractsResult, ContractRepositoryError>> => {
    const r = await deps.contractRepo.listPaged(query);
    if (!r.ok) return r;
    const totalPages = r.value.total === 0 ? 0 : Math.ceil(r.value.total / query.limit);
    return ok({
      items: r.value.items,
      meta: { page: query.page, limit: query.limit, total: r.value.total, totalPages },
    });
  };
