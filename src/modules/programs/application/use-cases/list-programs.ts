import { type Result, ok } from '#src/shared/index.ts';
import type { Program } from '#src/modules/programs/domain/program/types.ts';
import type {
  ProgramRepository,
  ProgramRepositoryError,
  ListProgramsQuery,
} from '#src/modules/programs/domain/program/repository.ts';

type Deps = Readonly<{ programRepo: ProgramRepository }>;

// Meta de paginação harmonizada (espelha contracts/auth/partners).
export type ListProgramsMeta = Readonly<{
  currentPage: number;
  itemsPerPage: number;
  itemCount: number;
  totalItems: number;
  totalPages: number;
}>;

export type ListProgramsResult = Readonly<{
  items: readonly Program[];
  meta: ListProgramsMeta;
}>;

// A query (validada na borda Zod) é repassada ao repositório, que filtra/ordena/pagina.
// O use case apenas deriva `totalPages = ceil(total/limit)`.
export const listPrograms =
  (deps: Deps) =>
  async (query: ListProgramsQuery): Promise<Result<ListProgramsResult, ProgramRepositoryError>> => {
    const r = await deps.programRepo.listPaged(query);
    if (!r.ok) return r;
    const totalPages = r.value.total === 0 ? 0 : Math.ceil(r.value.total / query.limit);
    return ok({
      items: r.value.items,
      meta: {
        currentPage: query.page,
        itemsPerPage: query.limit,
        itemCount: r.value.items.length,
        totalItems: r.value.total,
        totalPages,
      },
    });
  };
