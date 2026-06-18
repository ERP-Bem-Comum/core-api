import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  SuggestionCandidate,
  SuggestionView,
  SuggestionViewError,
} from '#src/modules/financial/application/ports/suggestion-view.ts';

// Store dedicado (testes/composição de memória semeiam direto). O driver mysql faz JOIN em fin_payables.
export type SuggestionCandidateStore = Map<string, SuggestionCandidate>;

export const createInMemorySuggestionView = (
  candidates: SuggestionCandidateStore = new Map<string, SuggestionCandidate>(),
): SuggestionView => ({
  listCandidates: async (): Promise<Result<readonly SuggestionCandidate[], SuggestionViewError>> =>
    Promise.resolve(ok([...candidates.values()])),
});
