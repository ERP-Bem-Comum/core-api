import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { compute, dateWithinTolerance } from '../../domain/reconciliation/match-score.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  ExpectedCounterpartStore,
  ExpectedCounterpartStoreError,
} from '../ports/expected-counterpart-store.ts';

export type CounterpartSuggestion = Readonly<{
  counterpartId: string;
  originAccountRef: string;
  valueCents: number;
  expectedDate: Date;
  score: number;
}>;

export type SuggestCounterpartMatchesDeps = Readonly<{
  statements: Pick<BankStatementRepository, 'findTransaction'>;
  expectedCounterpartStore: Pick<ExpectedCounterpartStore, 'listPendingByAccount'>;
}>;

export type SuggestCounterpartMatchesError =
  | 'statement-transaction-not-found'
  | 'cedente-account-not-found'
  | BankStatementRepositoryError
  | ExpectedCounterpartStoreError;

// US2 (#269): sugere o casamento transação real de B × contrapartida esperada `Pending` da MESMA conta.
// Casa por valor EXATO + movimento igual ao esperado + data na janela (~5d, reusa `match-score`). Empate
// → mais antiga (`expectedDate` asc) primeiro (CA4). Read-model — NUNCA concilia (R1).
export const suggestCounterpartMatches =
  (deps: SuggestCounterpartMatchesDeps) =>
  async (
    transactionId: string,
  ): Promise<Result<readonly CounterpartSuggestion[], SuggestCounterpartMatchesError>> => {
    const txR = await deps.statements.findTransaction(transactionId);
    if (!txR.ok) return err(txR.error);
    if (txR.value === null) return err('statement-transaction-not-found');
    const { transaction, debitAccountRef } = txR.value;

    const accId = CedenteAccountId.rehydrate(debitAccountRef);
    if (!accId.ok) return err('cedente-account-not-found');

    const pendingR = await deps.expectedCounterpartStore.listPendingByAccount(accId.value);
    if (!pendingR.ok) return err(pendingR.error);

    const matches: CounterpartSuggestion[] = [];
    for (const counterpart of pendingR.value) {
      const exactValue = transaction.valueCents === Number(counterpart.valueCents);
      const sameMovement = transaction.movement === counterpart.movement;
      const withinWindow = dateWithinTolerance(transaction.date, counterpart.expectedDate);
      if (!exactValue || !sameMovement || !withinWindow) continue;

      // Score p/ a UI: valor exato + data na janela são pré-requisitos → banda 'media' consistente.
      const score = compute({
        exactValue: true,
        dateD0: true,
        payeeMatch: false,
        memoRef: false,
        supplierOpenCount: 0,
      });
      matches.push({
        counterpartId: String(counterpart.id),
        originAccountRef: String(counterpart.originAccountRef),
        valueCents: Number(counterpart.valueCents),
        expectedDate: counterpart.expectedDate,
        score,
      });
    }

    // CA4: empate → contrapartida mais antiga primeiro (expectedDate asc).
    return ok([...matches].sort((a, b) => a.expectedDate.getTime() - b.expectedDate.getTime()));
  };
