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

// Limite inferior (constante) para varrer todo o histórico até `to` — não é "agora", é o piso do range.
const HISTORY_START = new Date('1970-01-01T00:00:00.000Z');

// #139: read-model do extrato por conta + período. running balance/agrupamento/contadores são puros
// (buildStatementView).
// #205: a abertura do PERÍODO = abertura da conta (#138) + Σ assinado das transações anteriores a `from`
// (não a abertura fixa da conta). Varre o histórico até `to` numa única query e particiona por data: o
// saldo corrido até o início do range vira a abertura do período. Sem novo port.
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

    const accountOpening = account.value.openingBalanceCents ?? 0;

    const history = await deps.statements.listTransactionsByPeriod(
      input.accountId,
      HISTORY_START,
      input.to,
    );
    if (!history.ok) return err(history.error);

    const fromMs = input.from.getTime();
    const before = history.value.filter((t) => t.date.getTime() < fromMs);
    const inRange = history.value.filter((t) => t.date.getTime() >= fromMs);

    // Saldo corrido até o início do range = abertura do período (closingBalance do sub-extrato anterior).
    const periodOpening = buildStatementView(accountOpening, before, 'all').closingBalanceCents;

    return ok(buildStatementView(periodOpening, inRange, input.filter ?? 'all'));
  };
