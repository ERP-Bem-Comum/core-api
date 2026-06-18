import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  RejectedSuggestionRepository,
  RejectedSuggestionRepositoryError,
  RejectSuggestionRecord,
} from '#src/modules/financial/application/ports/rejected-suggestion-repository.ts';

// transactionId → conjunto de payableIds rejeitados. Idempotente por construção (Set).
export type RejectedSuggestionStore = Map<string, Set<string>>;

export const createInMemoryRejectedSuggestionRepository = (
  store: RejectedSuggestionStore = new Map<string, Set<string>>(),
): RejectedSuggestionRepository => ({
  save: async (
    record: RejectSuggestionRecord,
  ): Promise<Result<void, RejectedSuggestionRepositoryError>> => {
    const set = store.get(record.transactionId) ?? new Set<string>();
    set.add(record.payableId);
    store.set(record.transactionId, set);
    return Promise.resolve(ok(undefined));
  },

  listByTransaction: async (
    transactionId: string,
  ): Promise<Result<ReadonlySet<string>, RejectedSuggestionRepositoryError>> =>
    Promise.resolve(ok(store.get(transactionId) ?? new Set<string>())),
});
