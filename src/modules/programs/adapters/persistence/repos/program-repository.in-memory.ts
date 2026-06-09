import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { Program } from '../../../domain/program/types.ts';
import type { ProgramId } from '../../../domain/shared/program-id.ts';
import type {
  ProgramRepository,
  ListProgramsQuery,
  ProgramPage,
} from '../../../domain/program/repository.ts';
import type { OutboxPort } from '../../../application/ports/outbox.ts';
import { InMemoryOutbox } from '../../outbox/outbox.in-memory.ts';

const matchesQuery = (p: Program, query: ListProgramsQuery): boolean => {
  if (query.status !== undefined && p.status !== query.status) return false;
  if (query.search !== undefined && query.search.length > 0) {
    const term = query.search.toLowerCase();
    const haystack = `${p.name}\n${String(p.sigla)}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  return true;
};

export type InMemoryProgramRepositoryHandle = Readonly<{
  repo: ProgramRepository;
  clear: () => void;
}>;

export const InMemoryProgramRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,
): InMemoryProgramRepositoryHandle => {
  const map = new Map<ProgramId, Program>();

  const repo: ProgramRepository = {
    findById: async (id) => ok(map.get(id) ?? null),

    findBySigla: async (siglaNormalized) =>
      ok([...map.values()].find((p) => String(p.sigla) === siglaNormalized) ?? null),

    listPaged: async (query): Promise<Result<ProgramPage, never>> => {
      const filtered = [...map.values()]
        .filter((p) => matchesQuery(p, query))
        .sort((a, b) =>
          query.order === 'DESC'
            ? b.programNumber - a.programNumber
            : a.programNumber - b.programNumber,
        );
      const offset = (query.page - 1) * query.limit;
      const items = filtered.slice(offset, offset + query.limit);
      return ok({ items, total: filtered.length });
    },

    nextProgramNumber: async () => {
      const max = [...map.values()].reduce(
        (m, p) => (p.programNumber > m ? p.programNumber : m),
        0,
      );
      return ok(max + 1);
    },

    save: async (program, events) => {
      map.set(program.id, program);
      if (events.length > 0) {
        const appended = await outbox.append(events);
        if (!appended.ok) return err(appended.error);
      }
      return ok(undefined);
    },
  };

  return {
    repo,
    clear: () => {
      map.clear();
    },
  };
};
