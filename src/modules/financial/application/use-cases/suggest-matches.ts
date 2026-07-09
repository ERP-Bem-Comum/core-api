import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { compute, band, evaluateCriteria } from '../../domain/reconciliation/match-score.ts';
import type {
  MatchBand,
  MatchCriteria,
  MatchScore,
} from '../../domain/reconciliation/match-score.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type { SuggestionView, SuggestionViewError } from '../ports/suggestion-view.ts';
import type {
  RejectedSuggestionRepository,
  RejectedSuggestionRepositoryError,
} from '../ports/rejected-suggestion-repository.ts';

export type SuggestMatchesDeps = Readonly<{
  statements: Pick<BankStatementRepository, 'findTransaction'>;
  suggestions: SuggestionView;
  rejected: Pick<RejectedSuggestionRepository, 'listByTransaction'>;
}>;

// band `baixa` é filtrada (FR-011) — a sugestão só carrega alta|media.
export type MatchSuggestion = Readonly<{
  payableId: string;
  score: MatchScore;
  band: Exclude<MatchBand, 'baixa'>;
  criteria: MatchCriteria;
}>;

export type SuggestMatchesError =
  | 'statement-transaction-not-found'
  | BankStatementRepositoryError
  | SuggestionViewError
  | RejectedSuggestionRepositoryError;

// Read-model (D-MATCH): computa as sugestões sob demanda para uma transação `Pending`. Exclui as duplas
// já rejeitadas e as de band `baixa` (<50, FR-011); ordena por score desc. NUNCA concilia (R1).
export const suggestMatches =
  (deps: SuggestMatchesDeps) =>
  async (
    transactionId: string,
  ): Promise<Result<readonly MatchSuggestion[], SuggestMatchesError>> => {
    const txR = await deps.statements.findTransaction(transactionId);
    if (!txR.ok) return err(txR.error);
    if (txR.value === null) return err('statement-transaction-not-found');
    const tx = txR.value.transaction;

    const candidatesR = await deps.suggestions.listCandidates();
    if (!candidatesR.ok) return err(candidatesR.error);

    const rejectedR = await deps.rejected.listByTransaction(transactionId);
    if (!rejectedR.ok) return err(rejectedR.error);
    const rejected = rejectedR.value;

    // `supplierOpenCount` = quantos candidatos compartilham o mesmo fornecedor (sinal de baixo peso).
    const openBySupplier = new Map<string, number>();
    for (const c of candidatesR.value) {
      if (c.supplierRef === null) continue;
      openBySupplier.set(c.supplierRef, (openBySupplier.get(c.supplierRef) ?? 0) + 1);
    }

    const suggestions: MatchSuggestion[] = [];
    for (const candidate of candidatesR.value) {
      if (rejected.has(candidate.payableId)) continue;
      const criteria = evaluateCriteria({
        payeeName: tx.payeeName,
        supplierName: candidate.supplierName,
        transactionValueCents: tx.valueCents,
        payableValueCents: candidate.valueCents,
        transactionDate: tx.date,
        payableDueDate: candidate.dueDate,
        paidAt: candidate.paidAt,
        memo: tx.memo,
        documentNumber: candidate.documentNumber,
        supplierOpenCount:
          candidate.supplierRef === null ? 0 : (openBySupplier.get(candidate.supplierRef) ?? 0),
      });
      const score = compute(criteria);
      const scoreBand = band(score);
      if (scoreBand === 'baixa') continue;
      suggestions.push({ payableId: candidate.payableId, score, band: scoreBand, criteria });
    }

    suggestions.sort((a, b) => b.score - a.score);
    return ok(suggestions);
  };
