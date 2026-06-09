import type { Result } from '../../../../shared/primitives/result.ts';
import type { ProgramId } from '../shared/program-id.ts';
import type { Program } from './types.ts';
import type { ProgramStatus } from './status.ts';
import type { ProgramsModuleEvent } from '../../public-api/events.ts';
import type { OutboxAppendError } from '../../application/ports/outbox.ts';

export type ProgramRepositoryError =
  | 'program-repo-unavailable'
  | 'program-repo-conflict'
  | OutboxAppendError;

export type ListProgramsQuery = Readonly<{
  page: number; // 1-based (validado na borda)
  limit: number; // teto aplicado na borda
  order: 'ASC' | 'DESC';
  search?: string; // substring case-insensitive em name OU sigla
  status?: ProgramStatus;
}>;

export type ProgramPage = Readonly<{
  items: readonly Program[];
  total: number; // total pós-filtro (meta.totalPages calculado no use case)
}>;

export type ProgramRepository = Readonly<{
  findById: (id: ProgramId) => Promise<Result<Program | null, ProgramRepositoryError>>;
  findBySigla: (siglaNormalized: string) => Promise<Result<Program | null, ProgramRepositoryError>>;
  listPaged: (query: ListProgramsQuery) => Promise<Result<ProgramPage, ProgramRepositoryError>>;
  // Próximo número sequencial de exibição. InMemory: MAX+1; Drizzle: MAX+1 sob FOR UPDATE.
  nextProgramNumber: () => Promise<Result<number, ProgramRepositoryError>>;
  save: (
    program: Program,
    events: readonly ProgramsModuleEvent[],
  ) => Promise<Result<void, ProgramRepositoryError>>;
}>;
