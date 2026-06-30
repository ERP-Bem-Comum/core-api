import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import type {
  RejectedSuggestionRepository,
  RejectedSuggestionRepositoryError,
} from '../ports/rejected-suggestion-repository.ts';

export type RejectSuggestionDeps = Readonly<{
  rejected: Pick<RejectedSuggestionRepository, 'save'>;
  clock: Pick<Clock, 'now'>;
}>;

export type RejectSuggestionInput = Readonly<{
  transactionId: string;
  payableId: string;
  rejectedBy: string;
}>;

export type RejectSuggestionOutput = Readonly<{
  transactionId: string;
  payableId: string;
}>;

export type RejectSuggestionError = RejectedSuggestionRepositoryError;

// Persiste o marcador de rejeição (D-MATCH) para a sugestão não reaparecer. Idempotente no adapter.
export const rejectSuggestion =
  (deps: RejectSuggestionDeps) =>
  async (
    input: RejectSuggestionInput,
  ): Promise<Result<RejectSuggestionOutput, RejectSuggestionError>> => {
    const saved = await deps.rejected.save({
      transactionId: input.transactionId,
      payableId: input.payableId,
      rejectedBy: input.rejectedBy,
      occurredAt: deps.clock.now(),
    });
    if (!saved.ok) return err(saved.error);
    return ok({ transactionId: input.transactionId, payableId: input.payableId });
  };
