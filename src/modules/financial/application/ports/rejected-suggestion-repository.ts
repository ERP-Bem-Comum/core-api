import type { Result } from '../../../../shared/primitives/result.ts';

// Persistência da REJEIÇÃO de sugestão (D-MATCH): só o marcador é persistido — a sugestão em si é
// read-model computado sob demanda. `save` é idempotente (UNIQUE (transaction_id, payable_id)).
export type RejectedSuggestionRepositoryError = 'rejected-suggestion-repository-failure';

export type RejectSuggestionRecord = Readonly<{
  transactionId: string;
  payableId: string;
  rejectedBy: string;
  occurredAt: Date;
}>;

export type RejectedSuggestionRepository = Readonly<{
  save: (
    record: RejectSuggestionRecord,
  ) => Promise<Result<void, RejectedSuggestionRepositoryError>>;
  // payableIds das duplas (transação→título) já rejeitadas para a transação — usado p/ filtrar sugestões.
  listByTransaction: (
    transactionId: string,
  ) => Promise<Result<ReadonlySet<string>, RejectedSuggestionRepositoryError>>;
}>;
