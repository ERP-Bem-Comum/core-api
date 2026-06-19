import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { MatchBand } from '../../domain/reconciliation/match-score.ts';
import type { suggestMatches, SuggestMatchesError } from './suggest-matches.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';

export type StatementSuggestionItem = Readonly<{
  transactionId: string;
  topBand: Exclude<MatchBand, 'baixa'> | null;
  topScore: number | null;
}>;

export type GetStatementSuggestionsInput = Readonly<{ statementId: string }>;

export type GetStatementSuggestionsOutput = Readonly<{
  items: readonly StatementSuggestionItem[];
}>;

export type GetStatementSuggestionsError =
  | 'bank-statement-not-found'
  | BankStatementRepositoryError
  | SuggestMatchesError;

type Deps = Readonly<{
  listStatementTransactions: BankStatementRepository['listTransactions'];
  suggestMatches: ReturnType<typeof suggestMatches>;
}>;

// #174: palpite de topo (banda/score) por transação de um extrato — evita N requisições no front.
// Só transações `Pending` recebem palpite (conciliadas → null; o front já mostra "conciliado").
export const getStatementSuggestions =
  (deps: Deps) =>
  async (
    input: GetStatementSuggestionsInput,
  ): Promise<Result<GetStatementSuggestionsOutput, GetStatementSuggestionsError>> => {
    const txs = await deps.listStatementTransactions(input.statementId);
    if (!txs.ok) return err(txs.error);
    if (txs.value === null) return err('bank-statement-not-found');

    const items: StatementSuggestionItem[] = [];
    for (const tx of txs.value) {
      if (tx.reconciliationStatus !== 'Pending') {
        items.push({ transactionId: String(tx.id), topBand: null, topScore: null });
        continue;
      }
      const suggestions = await deps.suggestMatches(String(tx.id));
      if (!suggestions.ok) return err(suggestions.error);
      const top = suggestions.value[0]; // já ordenado por score desc
      items.push({
        transactionId: String(tx.id),
        topBand: top?.band ?? null,
        topScore: top !== undefined ? top.score : null,
      });
    }

    return ok({ items });
  };
