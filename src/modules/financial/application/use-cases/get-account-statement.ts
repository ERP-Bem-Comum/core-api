import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import type { CedenteAccountIdError } from '../../domain/cedente/cedente-account-id.ts';
import {
  buildStatementView,
  type StatementFilter,
  type StatementView,
} from '../../domain/statement/statement-view.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';

export type GetAccountStatementInput = Readonly<{
  accountId: string;
  from: Date;
  to: Date;
  filter?: StatementFilter;
}>;

export type GetAccountStatementError =
  | 'cedente-account-not-found'
  | CedenteAccountIdError
  | CedenteAccountStoreError
  | BankStatementRepositoryError;

type Deps = Readonly<{
  cedenteStore: Pick<CedenteAccountStore, 'findById'>;
  statements: Pick<BankStatementRepository, 'listTransactionsByPeriod'>;
}>;

// #139: read-model do extrato por conta + período. Saldo de abertura vem da conta-cedente (#138);
// running balance/agrupamento/contadores são puros (buildStatementView).
export const getAccountStatement =
  (deps: Deps) =>
  async (
    input: GetAccountStatementInput,
  ): Promise<Result<StatementView, GetAccountStatementError>> => {
    const id = CedenteAccountId.rehydrate(input.accountId);
    if (!id.ok) return err(id.error);

    const account = await deps.cedenteStore.findById(id.value);
    if (!account.ok) return err(account.error);
    if (account.value === null) return err('cedente-account-not-found');

    const opening = account.value.openingBalanceCents ?? 0;

    const txs = await deps.statements.listTransactionsByPeriod(
      input.accountId,
      input.from,
      input.to,
    );
    if (!txs.ok) return err(txs.error);

    return ok(buildStatementView(opening, txs.value, input.filter ?? 'all'));
  };
