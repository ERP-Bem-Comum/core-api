import { ok } from '../../../shared/result.ts';
import type { AmendmentId } from '../domain/shared/ids.ts';
import type { Amendment } from '../domain/amendment/types.ts';
import type { AmendmentRepository } from '../application/ports/amendment-repository.ts';

export type InMemoryAmendmentRepositoryHandle = Readonly<{
  repo: AmendmentRepository;
  store: () => readonly Amendment[];
  clear: () => void;
}>;

export const InMemoryAmendmentRepository = (): InMemoryAmendmentRepositoryHandle => {
  const map = new Map<AmendmentId, Amendment>();

  const repo: AmendmentRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    save: async (amendment) => {
      map.set(amendment.id, amendment);
      return ok(undefined);
    },
  };

  return {
    repo,
    store: () => [...map.values()],
    clear: () => {
      map.clear();
    },
  };
};
